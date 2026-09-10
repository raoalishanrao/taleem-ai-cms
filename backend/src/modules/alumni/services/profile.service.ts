import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ALUMNI_REPOSITORY,
  PHOTO_STORAGE,
} from '../../../common/constants/tokens';
import { PortalMediaType } from '../../../common/enums';
import {
  BusinessException,
  ResourceNotFoundException,
} from '../../../common/exceptions';
import type { IObjectStorage } from '../../../common/interfaces/photo-storage.interface';
import { UpdateProfileDto } from '../dto/f001.dto';
import type { IAlumniRepository } from '../interfaces/alumni.repository.interface';
import { PortalMediaService } from '../../media/portal-media.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @Inject(ALUMNI_REPOSITORY)
    private readonly alumniRepository: IAlumniRepository,
    @Inject(PHOTO_STORAGE) private readonly objectStorage: IObjectStorage,
    private readonly portalMediaService: PortalMediaService,
  ) {}

  async getMyProfile(userId: string, email?: string) {
    const profile = await this.resolveBoundProfile(userId, email);
    if (!profile) {
      throw new ResourceNotFoundException('Alumni profile for user', userId);
    }
    return this.toResponse(profile);
  }

  /**
   * Bind IAM identity (`sub`) to an existing alumni row matched by email
   * within the current tenant when userId is still null.
   */
  async resolveBoundProfile(userId: string, email?: string) {
    const byUser = await this.alumniRepository.findByUserId(userId);
    if (byUser) return byUser;

    if (!email?.trim()) return null;

    const byEmail = await this.alumniRepository.findByEmail(email);
    if (!byEmail) return null;

    if (
      byEmail.alumni.userId &&
      byEmail.alumni.userId !== userId
    ) {
      throw new BusinessException(
        'Alumni profile is already linked to another identity',
        HttpStatus.CONFLICT,
        'IDENTITY_CONFLICT',
      );
    }

    if (!byEmail.alumni.userId) {
      await this.alumniRepository.updateAlumni(byEmail.alumni.id, {
        userId,
      });
      this.logger.log(
        `ALUMNI_IDENTITY_BOUND alumniId=${byEmail.alumni.id} userId=${userId}`,
      );
      return (await this.alumniRepository.findByUserId(userId)) ?? byEmail;
    }

    return byEmail;
  }

  /** Fetch profile photo bytes server-side (avoids browser CORS on object storage). */
  async getMyPhotoBytes(userId: string, email?: string): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    const profile = await this.resolveBoundProfile(userId, email);
    if (!profile) {
      throw new ResourceNotFoundException('Alumni profile for user', userId);
    }
    const photoUrl = await this.portalMediaService.resolvePublicUrl(
      profile.alumni.photoMedia,
    );
    if (!photoUrl) {
      throw new ResourceNotFoundException('Alumni photo for user', userId);
    }

    const response = await fetch(photoUrl);
    if (!response.ok) {
      this.logger.warn(
        `PHOTO_PROXY_FAILED userId=${userId} status=${response.status}`,
      );
      throw new ResourceNotFoundException('Alumni photo for user', userId);
    }
    const contentType =
      response.headers.get('content-type')?.split(';')[0]?.trim() ||
      'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, contentType };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto, email?: string) {
    const profile = await this.resolveBoundProfile(userId, email);
    if (!profile) {
      throw new ResourceNotFoundException('Alumni profile for user', userId);
    }

    await this.alumniRepository.updateAlumni(profile.alumni.id, {
      phoneNumber: dto.phone_number,
      whatsappNumber: dto.whatsapp_number,
      address: dto.address,
      secondryAddress: dto.secondry_address,
      city: dto.city,
      country: dto.country,
      gender: dto.gender,
      dateOfBirth: dto.date_of_birth ? new Date(dto.date_of_birth) : undefined,
      linkedinUrl: dto.linkedin_url,
      ...(dto.media_id
        ? { photoMediaId: await this.requirePhotoMedia(dto.media_id) }
        : {}),
    });

    this.logger.log(`ALUMNI_PROFILE_UPDATED alumniId=${profile.alumni.id}`);
    const updated = await this.alumniRepository.findById(profile.alumni.id);
    return this.toResponse(updated!);
  }

  private async requirePhotoMedia(mediaId: string) {
    const media = await this.portalMediaService.requireById(mediaId);
    if (
      media.mediaType !== PortalMediaType.REGISTRATION_PHOTO &&
      media.mediaType !== PortalMediaType.ALUMNI_PHOTO
    ) {
      throw new BusinessException('Uploaded file is not a valid profile photo');
    }
    return media.id;
  }

  private async toResponse(
    profile: NonNullable<Awaited<ReturnType<IAlumniRepository['findById']>>>,
  ) {
    const a = profile.alumni;
    const qrCode = a.qrCode
      ? await this.objectStorage.resolveDownloadUrl(a.qrCode)
      : a.qrCode;
    const photoUrl = await this.portalMediaService.resolvePublicUrl(
      a.photoMedia,
    );

    return {
      alumni_id: a.id,
      public_alumni_code: a.publicAlumniCode,
      full_name: a.fullName,
      email: a.email,
      status: a.status,
      phone_number: a.phoneNumber,
      whatsapp_number: a.whatsappNumber,
      cnic_national_id: a.cnicNationalId,
      address: a.address,
      secondry_address: a.secondryAddress,
      city: a.city,
      country: a.country,
      gender: a.gender,
      date_of_birth: a.dateOfBirth,
      linkedin_url: a.linkedinUrl,
      photo_url: photoUrl,
      qr_code: qrCode,
      academic: this.mapAcademic(profile.academic),
      professional: this.mapProfessional(profile.professional),
    };
  }

  private mapAcademic(
    rows: NonNullable<
      Awaited<ReturnType<IAlumniRepository['findById']>>
    >['academic'],
  ) {
    const verificationId = [...rows].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )[0]?.id;

    return rows.map((row) => ({
      id: row.id,
      degree_program_id: row.degreeProgramId,
      registration_roll_number: row.registrationRollNumber,
      registration_year: row.registrationYear,
      graduation_year: row.graduationYear,
      cgpa: row.cgpa,
      is_verification: row.id === verificationId,
    }));
  }

  private mapProfessional(
    rows: NonNullable<
      Awaited<ReturnType<IAlumniRepository['findById']>>
    >['professional'],
  ) {
    return rows.map((row) => ({
      id: row.id,
      current_company: row.currentCompany,
      job_title: row.jobTitle,
      role: row.role,
      start_date: row.startDate,
      end_date: row.endDate,
    }));
  }
}
