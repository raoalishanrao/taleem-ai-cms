import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../../../common/auth/tenant-context';
import { AlumniStatus } from '../../../common/enums';
import {
  AlumniEntity,
  AlumniNotificationEntity,
  AlumniNotificationType,
} from '../../../database/entities';
import type {
  NotificationItemDto,
  NotificationsSummaryDto,
} from '../dto/notifications.dto';

const ITEM_LIMIT = 20;

@Injectable()
export class AlumniNotificationsService {
  private readonly logger = new Logger(AlumniNotificationsService.name);

  constructor(
    @InjectRepository(AlumniNotificationEntity)
    private readonly notificationRepo: Repository<AlumniNotificationEntity>,
    @InjectRepository(AlumniEntity)
    private readonly alumniRepo: Repository<AlumniEntity>,
  ) {}

  private tenantId(): string {
    return TenantContext.requireTenantId();
  }

  async getSummary(userId: string): Promise<NotificationsSummaryDto> {
    const me = await this.alumniRepo.findOne({ where: { userId, tenantId: this.tenantId() } });
    if (!me) {
      return {
        unread_count: 0,
        alumni: 0,
        events: 0,
        announcements: 0,
        since: new Date(),
        items: [],
      };
    }

    const [unreadRows, items] = await Promise.all([
      this.notificationRepo
        .createQueryBuilder('n')
        .select('n.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('n.alumni_id = :alumniId', { alumniId: me.id })
        .andWhere('n.tenant_id = :tenantId', { tenantId: this.tenantId() })
        .andWhere('n.is_read = false')
        .groupBy('n.type')
        .getRawMany<{ type: AlumniNotificationType; count: string }>(),
      this.notificationRepo.find({
        where: { alumniId: me.id, tenantId: this.tenantId() },
        order: { createdAt: 'DESC' },
        take: ITEM_LIMIT,
      }),
    ]);

    const byType: Record<string, number> = {
      alumni: 0,
      event: 0,
      announcement: 0,
    };
    for (const row of unreadRows) {
      byType[row.type] = Number(row.count) || 0;
    }

    const mapped: NotificationItemDto[] = items.map((row) => ({
      type: row.type,
      id: row.referenceId ?? row.id,
      title: row.title,
      occurred_at: row.createdAt,
      is_read: row.isRead,
      notification_id: row.id,
    }));

    return {
      unread_count: byType.alumni + byType.event + byType.announcement,
      alumni: byType.alumni,
      events: byType.event,
      announcements: byType.announcement,
      since: new Date(),
      items: mapped,
    };
  }

  async markRead(userId: string, notificationIds?: string[]) {
    const me = await this.alumniRepo.findOne({ where: { userId, tenantId: this.tenantId() } });
    if (!me) return { updated: 0 };

    if (notificationIds && notificationIds.length > 0) {
      const result = await this.notificationRepo
        .createQueryBuilder()
        .update(AlumniNotificationEntity)
        .set({ isRead: true })
        .where('alumni_id = :alumniId', { alumniId: me.id })
        .andWhere('tenant_id = :tenantId', { tenantId: this.tenantId() })
        .andWhere('is_read = false')
        .andWhere('id IN (:...ids)', { ids: notificationIds })
        .execute();
      return { updated: result.affected ?? 0 };
    }

    const result = await this.notificationRepo.update(
      { alumniId: me.id, isRead: false, tenantId: this.tenantId() },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }

  async createForAlumniIds(input: {
    alumniIds: string[];
    type: AlumniNotificationType;
    title: string;
    referenceId: string;
  }) {
    const uniqueIds = [...new Set(input.alumniIds)].filter(Boolean);
    if (uniqueIds.length === 0) return 0;

    const tenantId = this.tenantId();
    const rows = uniqueIds.map((alumniId) =>
      this.notificationRepo.create({
        tenantId,
        alumniId,
        type: input.type,
        title: input.title,
        referenceId: input.referenceId,
        isRead: false,
      }),
    );

    await this.notificationRepo.save(rows);
    return rows.length;
  }

  async notifyAllActiveAlumni(input: {
    type: AlumniNotificationType;
    title: string;
    referenceId: string;
    excludeAlumniId?: string;
  }) {
    try {
      const qb = this.alumniRepo
        .createQueryBuilder('alumni')
        .select('alumni.id', 'id')
        .where('alumni.tenant_id = :tenantId', { tenantId: this.tenantId() })
        .andWhere('alumni.status = :status', { status: AlumniStatus.ACTIVE });

      if (input.excludeAlumniId) {
        qb.andWhere('alumni.id != :excludeId', {
          excludeId: input.excludeAlumniId,
        });
      }

      const rows = await qb.getRawMany<{ id: string }>();
      const count = await this.createForAlumniIds({
        alumniIds: rows.map((row) => row.id),
        type: input.type,
        title: input.title,
        referenceId: input.referenceId,
      });
      this.logger.log(
        `NOTIFICATION_FANOUT type=${input.type} ref=${input.referenceId} count=${count}`,
      );
      return count;
    } catch (error) {
      this.logger.error(
        `NOTIFICATION_FANOUT_FAILED type=${input.type}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }

  async notifySpecificAlumni(input: {
    alumniIds: string[];
    type: AlumniNotificationType;
    title: string;
    referenceId: string;
  }) {
    try {
      const count = await this.createForAlumniIds(input);
      this.logger.log(
        `NOTIFICATION_TARGETED type=${input.type} ref=${input.referenceId} count=${count}`,
      );
      return count;
    } catch (error) {
      this.logger.error(
        `NOTIFICATION_TARGETED_FAILED type=${input.type}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }
}
