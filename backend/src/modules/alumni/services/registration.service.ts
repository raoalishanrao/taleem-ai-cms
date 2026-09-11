import { Inject, Injectable, Logger } from '@nestjs/common';
import { REGISTRATION_REQUEST_REPOSITORY } from '../../../common/constants/tokens';
import { PortalMediaType, RegistrationStatus } from '../../../common/enums';
import {
  ConflictException,
  BusinessException,
  ResourceNotFoundException,
} from '../../../common/exceptions';
import { RegisterDto } from '../dto/f001.dto';
import type { IRegistrationRequestRepository } from '../interfaces/registration-request.repository.interface';
import { PortalMediaService } from '../../media/portal-media.service';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @Inject(REGISTRATION_REQUEST_REPOSITORY)
    private readonly registrationRepository: IRegistrationRequestRepository,
    private readonly portalMediaService: PortalMediaService,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.registrationRepository.findByEmail(
      dto.email,
    );
    if (existingEmail && existingEmail.status !== RegistrationStatus.REJECTED) {
      throw new ConflictException(
        'A registration request already exists for this email',
      );
    }

    const existingCnic = await this.registrationRepository.findByCnic(
      dto.cnic_national_id,
    );
    if (existingCnic && existingCnic.status !== RegistrationStatus.REJECTED) {
      throw new ConflictException(
        'A registration request already exists for this CNIC',
      );
    }

    if (!dto.media_id) {
      throw new BusinessException('Profile photo is required');
    }
    await this.portalMediaService.requireById(
      dto.media_id,
      PortalMediaType.REGISTRATION_PHOTO,
    );
    const photoMediaId = dto.media_id;

    const referenceNumber =
      await this.registrationRepository.nextReferenceNumber();

    const created = await this.registrationRepository.create({
      tenantId: dto.tenant_id,
      fullName: dto.full_name,
      email: dto.email,
      phoneNumber: dto.phone_number,
      whatsappNumber: dto.whatsapp_number,
      cnicNationalId: dto.cnic_national_id,
      degreeProgramId: dto.degree_program_id,
      registrationRollNumber: dto.registration_roll_number,
      graduationYear: dto.graduation_year,
      referenceNumber,
      photoMediaId,
    });

    this.logger.log(
      `ALUMNI_REGISTER_SUBMITTED requestId=${created.id} email=${created.email} reference=${created.referenceNumber}`,
    );

    const photo_url = await this.portalMediaService.resolvePublicUrl(
      created.photoMedia,
    );

    return {
      registration_id: created.id,
      reference_number: created.referenceNumber,
      status: created.status,
      submitted_at: created.createdAt,
      photo_url,
      message:
        'Registration submitted and pending institutional verification',
    };
  }
}
