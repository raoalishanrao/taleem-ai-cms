import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ALUMNI_REPOSITORY,
  NOTIFICATION_SENDER,
  PHOTO_STORAGE,
} from '../../../common/constants/tokens';
import { AlumniPermission } from '../../../common/auth/alumni-permissions';
import { TenantContext } from '../../../common/auth/tenant-context';
import {
  AlumniStatus,
  AnnouncementCategory,
  PortalMediaType,
} from '../../../common/enums';
import {
  BusinessException,
  ResourceNotFoundException,
} from '../../../common/exceptions';
import type { INotificationSender } from '../../../common/interfaces/notification-sender.interface';
import type { IObjectStorage } from '../../../common/interfaces/photo-storage.interface';
import {
  AnnouncementEntity,
  DegreeProgramEntity,
} from '../../../database/entities';
import type { AlumniProfile } from '../../alumni/entities/alumni.entity';
import type { IAlumniRepository } from '../../alumni/interfaces/alumni.repository.interface';
import { AlumniNotificationsService } from '../../alumni/services/alumni-notifications.service';
import { AlumniNotificationType } from '../../../database/entities';
import { PortalMediaService } from '../../media/portal-media.service';
import {
  AnnouncementListQueryDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  UploadAnnouncementImageResponseDto,
} from '../dto/announcement.dto';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly announcementRepo: Repository<AnnouncementEntity>,
    @InjectRepository(DegreeProgramEntity)
    private readonly degreeProgramRepo: Repository<DegreeProgramEntity>,
    private readonly portalMediaService: PortalMediaService,
    @Inject(ALUMNI_REPOSITORY)
    private readonly alumniRepository: IAlumniRepository,
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: INotificationSender,
    @Inject(PHOTO_STORAGE)
    private readonly objectStorage: IObjectStorage,
    @Optional()
    private readonly alumniNotificationsService?: AlumniNotificationsService,
  ) {}

  private tenantId(): string {
    return TenantContext.requireTenantId();
  }

  async uploadImage(file?: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  }): Promise<UploadAnnouncementImageResponseDto> {
    return this.portalMediaService.uploadImage(
      file,
      PortalMediaType.ANNOUNCEMENT_IMAGE,
      'announcements',
    );
  }

  async list(userPermissions: string[], query: AnnouncementListQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.page_size ?? 20));
    const includeDrafts =
      query.include_drafts === true && this.isAdmin(userPermissions);

    const qb = this.announcementRepo
      .createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId: this.tenantId() })
      .leftJoinAndSelect('a.featuredAlumni', 'featuredAlumni')
      .leftJoinAndSelect('featuredAlumni.photoMedia', 'featuredAlumniPhoto')
      .leftJoinAndSelect('a.imageMedia', 'imageMedia')
      .orderBy('a.publishedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('a.id', 'DESC');

    if (!includeDrafts) {
      qb.andWhere('a.isPublished = true');
    }

    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const items = await Promise.all(rows.map((row) => this.toResponse(row)));
    return { items, total, page, page_size: pageSize };
  }

  async getById(id: string, userPermissions: string[]) {
    const row = await this.announcementRepo.findOne({
      where: { id, tenantId: this.tenantId() },
      relations: {
        featuredAlumni: { photoMedia: true },
        imageMedia: true,
      },
    });
    if (!row) {
      throw new ResourceNotFoundException('Announcement', id);
    }

    if (!row.isPublished && !this.isAdmin(userPermissions)) {
      throw new ResourceNotFoundException('Announcement', id);
    }

    return this.toResponse(row);
  }

  private isAdmin(permissions: string[]) {
    return (
      permissions.includes(AlumniPermission.ADMIN_NEWS_MANAGE) ||
      permissions.includes(AlumniPermission.ADMIN_ACCESS)
    );
  }

  async create(adminUserId: string, dto: CreateAnnouncementDto) {
    await this.validateSpotlight(dto.category, dto.featured_alumni_id);

    const isPublished = dto.is_published !== false;
    if (dto.media_id) {
      await this.portalMediaService.requireById(
        dto.media_id,
        PortalMediaType.ANNOUNCEMENT_IMAGE,
      );
    }

    const saved = await this.announcementRepo.save(
      this.announcementRepo.create({
        tenantId: this.tenantId(),
        title: dto.title.trim(),
        content: dto.content.trim(),
        category: dto.category,
        featuredAlumniId: dto.featured_alumni_id ?? null,
        imageMediaId: dto.media_id ?? null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        createdBy: adminUserId,
      }),
    );

    const withRelation = await this.announcementRepo.findOne({
      where: { id: saved.id },
      relations: {
        featuredAlumni: { photoMedia: true },
        imageMedia: true,
      },
    });

    if (isPublished && withRelation) {
      void this.notifyAlumniAboutAnnouncement(withRelation, 'published');
    }

    return this.toResponse(withRelation ?? saved);
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const row = await this.announcementRepo.findOne({
      where: { id, tenantId: this.tenantId() },
      relations: {
        featuredAlumni: { photoMedia: true },
        imageMedia: true,
      },
    });
    if (!row) {
      throw new ResourceNotFoundException('Announcement', id);
    }

    const wasPublished = row.isPublished;

    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.content !== undefined) row.content = dto.content.trim();
    if (dto.category !== undefined) row.category = dto.category;
    if (dto.featured_alumni_id !== undefined) {
      row.featuredAlumniId = dto.featured_alumni_id ?? null;
    }
    if (dto.media_id !== undefined) {
      if (dto.media_id) {
        await this.portalMediaService.requireById(
          dto.media_id,
          PortalMediaType.ANNOUNCEMENT_IMAGE,
        );
      }
      row.imageMediaId = dto.media_id ?? null;
    }
    if (dto.is_published !== undefined) {
      row.isPublished = dto.is_published;
      if (dto.is_published && !wasPublished) {
        row.publishedAt = new Date();
      }
      if (!dto.is_published) {
        // keep publishedAt for history when unpublishing
      }
    }

    const category = dto.category ?? row.category;
    const featuredId =
      dto.featured_alumni_id !== undefined
        ? dto.featured_alumni_id
        : row.featuredAlumniId ?? undefined;
    await this.validateSpotlight(category, featuredId);

    const saved = await this.announcementRepo.save(row);
    const withRelation = await this.announcementRepo.findOne({
      where: { id: saved.id },
      relations: {
        featuredAlumni: { photoMedia: true },
        imageMedia: true,
      },
    });

    if (saved.isPublished && withRelation) {
      const reason = wasPublished ? 'updated' : 'published';
      void this.notifyAlumniAboutAnnouncement(withRelation, reason);
    }

    return this.toResponse(withRelation ?? saved);
  }

  async remove(id: string) {
    const row = await this.announcementRepo.findOne({ where: { id, tenantId: this.tenantId() } });
    if (!row) {
      throw new ResourceNotFoundException('Announcement', id);
    }
    await this.announcementRepo.remove(row);
    return { id, deleted: true };
  }

  private async validateSpotlight(
    category: AnnouncementCategory,
    featuredAlumniId?: string | null,
  ) {
    if (category === AnnouncementCategory.ALUMNI_SPOTLIGHT && !featuredAlumniId) {
      throw new BusinessException(
        'featured_alumni_id is required for ALUMNI_SPOTLIGHT',
      );
    }
    if (featuredAlumniId) {
      const featured = await this.alumniRepository.findById(featuredAlumniId);
      if (!featured) {
        throw new ResourceNotFoundException('Featured alumni', featuredAlumniId);
      }
    }
  }

  private async toResponse(row: AnnouncementEntity) {
    let featuredAlumni: Awaited<
      ReturnType<AnnouncementService['toFeaturedAlumni']>
    > | null = null;

    if (row.featuredAlumniId) {
      const profile = await this.alumniRepository.findById(row.featuredAlumniId);
      if (profile) {
        featuredAlumni = await this.toFeaturedAlumni(profile);
      } else if (row.featuredAlumni) {
        const photoUrl = await this.portalMediaService.resolvePublicUrl(
          row.featuredAlumni.photoMedia,
        );
        featuredAlumni = {
          alumni_id: row.featuredAlumni.id,
          full_name: row.featuredAlumni.fullName,
          photo_url: photoUrl,
          degree: null,
          graduation_year: null,
        };
      }
    }

    const imageUrl = await this.portalMediaService.resolvePublicUrl(
      row.imageMedia,
    );

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      featured_alumni_id: row.featuredAlumniId,
      featured_alumni: featuredAlumni,
      image_url: imageUrl,
      is_published: row.isPublished,
      published_at: row.publishedAt,
      created_by: row.createdBy,
    };
  }

  private async toFeaturedAlumni(profile: AlumniProfile): Promise<{
    alumni_id: string;
    full_name: string;
    photo_url: string | null;
    degree: string | null;
    graduation_year: string | null;
  }> {
    const academic = profile.academic[0];
    let degree: string | null = null;
    if (academic?.degreeProgramId) {
      const dp = await this.degreeProgramRepo.findOne({
        where: { id: academic.degreeProgramId },
        relations: { degree: true, program: true },
      });
      if (dp) {
        degree = `${dp.degree.name} — ${dp.program.name}`;
      }
    }

    const photoUrl = await this.portalMediaService.resolvePublicUrl(
      profile.alumni.photoMedia,
    );

    return {
      alumni_id: profile.alumni.id,
      full_name: profile.alumni.fullName,
      photo_url: photoUrl,
      degree,
      graduation_year: academic?.graduationYear ?? null,
    };
  }

  private async notifyAlumniAboutAnnouncement(
    announcement: AnnouncementEntity,
    reason: 'published' | 'updated' = 'published',
  ): Promise<void> {
    try {
      const profiles = await this.alumniRepository.findAll();
      const active = profiles.filter(
        (p) => p.alumni.status === AlumniStatus.ACTIVE && p.alumni.email,
      );

      if (this.alumniNotificationsService) {
        await this.alumniNotificationsService.notifyAllActiveAlumni({
          type: AlumniNotificationType.ANNOUNCEMENT,
          title:
            reason === 'updated'
              ? `Updated: ${announcement.title}`
              : announcement.title,
          referenceId: announcement.id,
        });
      }

      const imageUrl =
        (await this.portalMediaService.resolvePublicUrl(
          announcement.imageMedia,
        )) ?? '';

      const results = await Promise.allSettled(
        active.map((profile) =>
          this.notificationSender.send({
            to: profile.alumni.email,
            templateId:
              reason === 'updated'
                ? 'announcement_updated'
                : 'announcement_published',
            variables: {
              fullName: profile.alumni.fullName,
              announcementTitle: announcement.title,
              category: announcement.category,
              content: announcement.content,
              imageUrl,
            },
          }),
        ),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;
      this.logger.log(
        `ANNOUNCEMENT_NOTIFY reason=${reason} id=${announcement.id} sent=${results.length - failed} failed=${failed}`,
      );
    } catch (error) {
      this.logger.error(
        `ANNOUNCEMENT_NOTIFY_FAILED id=${announcement.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
