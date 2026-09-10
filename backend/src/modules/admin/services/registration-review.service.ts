import { Inject, Injectable } from '@nestjs/common';
import {
  ALUMNI_REPOSITORY,
  PHOTO_STORAGE,
  REGISTRATION_REQUEST_REPOSITORY,
} from '../../../common/constants/tokens';
import { RegistrationStatus } from '../../../common/enums';
import { ResourceNotFoundException } from '../../../common/exceptions';
import type { IObjectStorage } from '../../../common/interfaces/photo-storage.interface';
import type { IAlumniRepository } from '../../alumni/interfaces/alumni.repository.interface';
import type { IRegistrationRequestRepository } from '../../alumni/interfaces/registration-request.repository.interface';
import { AlumniRegistrationRequest } from '../../alumni/entities/alumni-registration-request.entity';
import type { AdminDashboardResponseDto } from '../dto/admin.dto';
import { PortalMediaService } from '../../media/portal-media.service';

@Injectable()
export class RegistrationReviewService {
  constructor(
    @Inject(REGISTRATION_REQUEST_REPOSITORY)
    private readonly registrationRepository: IRegistrationRequestRepository,
    @Inject(ALUMNI_REPOSITORY)
    private readonly alumniRepository: IAlumniRepository,
    @Inject(PHOTO_STORAGE)
    private readonly objectStorage: IObjectStorage,
    private readonly portalMediaService: PortalMediaService,
  ) {}

  async dashboard(): Promise<AdminDashboardResponseDto> {
    const all = await this.registrationRepository.findAll();
    const pending = all.filter((r) => r.status === RegistrationStatus.PENDING);
    const rejected = all.filter(
      (r) => r.status === RegistrationStatus.REJECTED,
    );
    const alumni = await this.alumniRepository.findAll();

    return {
      alumni_count: alumni.length,
      pending_registrations_count: pending.length,
      rejected_requests_count: rejected.length,
      pending_contact_requests_count: 0,
      published_events_count: 0,
      active_events_count: 0,
      completed_events_count: 0,
      latest_announcements: [],
    };
  }

  async list(status?: RegistrationStatus) {
    const items = await this.registrationRepository.findAll(status);
    return Promise.all(items.map((item) => this.toListItem(item)));
  }

  async detail(registrationId: string) {
    const request = await this.registrationRepository.findById(registrationId);
    if (!request) {
      throw new ResourceNotFoundException('Registration', registrationId);
    }

    const alumni =
      await this.alumniRepository.findByRegistrationRequestId(registrationId);

    const base = await this.toListItem(request);
    const qrDurable = alumni?.alumni.qrCode || null;

    return {
      ...base,
      whatsapp_number: request.whatsappNumber,
      rejection_reason: request.rejectionReason,
      reviewed_by: request.reviewedBy,
      reviewed_at: request.reviewedAt,
      photo_url: await this.portalMediaService.resolvePublicUrl(
        request.photoMedia,
      ),
      alumni: alumni
        ? {
            alumni_id: alumni.alumni.id,
            public_alumni_code: alumni.alumni.publicAlumniCode,
            status: alumni.alumni.status,
            user_id: alumni.alumni.userId,
            photo_url: await this.portalMediaService.resolvePublicUrl(
              alumni.alumni.photoMedia,
            ),
            qr_code: qrDurable
              ? await this.objectStorage.resolveDownloadUrl(qrDurable)
              : null,
          }
        : null,
    };
  }

  async resendNotification(registrationId: string) {
    const request = await this.registrationRepository.findById(registrationId);
    if (!request) {
      throw new ResourceNotFoundException('Registration', registrationId);
    }

    if (request.status === RegistrationStatus.APPROVED) {
      // Local activation emails are retired — IAM owns sign-in.
      throw new ResourceNotFoundException(
        'IAM OAuth sign-in is required; local activation resend is disabled',
        registrationId,
      );
    }

    throw new ResourceNotFoundException(
      'Approved registration for resend',
      registrationId,
    );
  }

  private async toListItem(request: AlumniRegistrationRequest) {
    return {
      registration_id: request.id,
      reference_number: request.referenceNumber,
      full_name: request.fullName,
      email: request.email,
      phone_number: request.phoneNumber,
      status: request.status,
      submitted_at: request.createdAt,
      degree_program_id: request.degreeProgramId,
      degree_program_name: request.degreeProgramName,
      registration_roll_number: request.registrationRollNumber,
      graduation_year: request.graduationYear,
      cnic_national_id: request.cnicNationalId,
      photo_url: await this.portalMediaService.resolvePublicUrl(
        request.photoMedia,
      ),
    };
  }
}
