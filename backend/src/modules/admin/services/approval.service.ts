import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  ALUMNI_REPOSITORY,
  NOTIFICATION_SENDER,
  REGISTRATION_REQUEST_REPOSITORY,
} from '../../../common/constants/tokens';
import { RegistrationStatus } from '../../../common/enums';
import {
  BusinessException,
  ResourceNotFoundException,
} from '../../../common/exceptions';
import type { INotificationSender } from '../../../common/interfaces/notification-sender.interface';
import { AlumniNotificationsService } from '../../alumni/services/alumni-notifications.service';
import { AlumniNotificationType } from '../../../database/entities';
import type { IAlumniRepository } from '../../alumni/interfaces/alumni.repository.interface';
import type { IRegistrationRequestRepository } from '../../alumni/interfaces/registration-request.repository.interface';
import { AlumniCardService } from './alumni-card.service';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    @Inject(REGISTRATION_REQUEST_REPOSITORY)
    private readonly registrationRepository: IRegistrationRequestRepository,
    @Inject(ALUMNI_REPOSITORY)
    private readonly alumniRepository: IAlumniRepository,
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: INotificationSender,
    private readonly alumniCardService: AlumniCardService,
    @Optional()
    private readonly alumniNotificationsService?: AlumniNotificationsService,
  ) {}

  async approve(
    registrationId: string,
    adminUserId: string,
    cnicNationalId: string,
  ) {
    const request = await this.registrationRepository.findById(registrationId);
    if (!request) {
      throw new ResourceNotFoundException('Registration', registrationId);
    }
    if (request.status !== RegistrationStatus.PENDING) {
      throw new BusinessException(
        `Registration is already ${request.status}`,
        HttpStatus.CONFLICT,
        'ALREADY_REVIEWED',
      );
    }
    if (request.cnicNationalId !== cnicNationalId.trim()) {
      throw new BusinessException(
        'CNIC does not match this registration request',
        HttpStatus.BAD_REQUEST,
        'CNIC_MISMATCH',
      );
    }

    let alumniId = '';
    let qrCode: string | null = null;
    let qrFailed = false;
    let notificationFailed = false;

    try {
      await this.registrationRepository.update(registrationId, {
        status: RegistrationStatus.APPROVED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        rejectionReason: null,
      });

      // Auth is IAM-owned. Alumni.userId stays null until the member signs in
      // with OAuth and ProfileService binds identity by email within the tenant.
      const profile = await this.alumniRepository.create({
        registrationRequestId: request.id,
        fullName: request.fullName,
        email: request.email,
        userId: null,
        phoneNumber: request.phoneNumber,
        whatsappNumber: request.whatsappNumber,
        cnicNationalId: request.cnicNationalId,
        photoMediaId: request.photoMediaId,
        publicAlumniCode: request.referenceNumber,
        academic: {
          degreeProgramId: request.degreeProgramId,
          registrationRollNumber: request.registrationRollNumber,
          graduationYear: request.graduationYear,
          registrationYear: null,
        },
      });
      alumniId = profile.alumni.id;

      if (this.alumniNotificationsService) {
        await this.alumniNotificationsService.notifyAllActiveAlumni({
          type: AlumniNotificationType.ALUMNI,
          title: request.fullName,
          referenceId: alumniId,
          excludeAlumniId: alumniId,
        });
      }

      this.logger.log(
        `REGISTRATION_APPROVED registrationId=${registrationId} alumniId=${alumniId} by=${adminUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `REGISTRATION_APPROVAL_FAILED registrationId=${registrationId}`,
      );
      throw error;
    }

    try {
      const card = await this.alumniCardService.generate(alumniId, {
        media_id: request.photoMediaId ?? undefined,
      });
      qrCode = card.qrCode;
      this.logger.log(`APPROVAL_QR_GENERATED alumniId=${alumniId}`);
    } catch (error) {
      qrFailed = true;
      this.logger.error(
        `APPROVAL_QR_FAILED alumniId=${alumniId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      await this.notificationSender.send({
        to: request.email,
        templateId: 'approval_with_activation_link',
        variables: {
          fullName: request.fullName,
          activationLink:
            process.env.ALUMNI_PORTAL_URL?.replace(/\/$/, '') ||
            'http://localhost:5173',
        },
      });
      this.logger.log(`APPROVAL_EMAIL_SENT alumniId=${alumniId}`);
    } catch {
      notificationFailed = true;
      this.logger.error(`APPROVAL_EMAIL_FAILED alumniId=${alumniId}`);
    }

    return {
      registration_id: registrationId,
      alumni_id: alumniId,
      user_id: null,
      status: RegistrationStatus.APPROVED,
      qr_code: qrCode,
      qr_failed: qrFailed,
      notification_failed: notificationFailed,
    };
  }
}
