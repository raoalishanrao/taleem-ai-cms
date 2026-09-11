import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ALUMNI_REPOSITORY,
  CONTACT_REQUEST_REPOSITORY,
  REGISTRATION_REQUEST_REPOSITORY,
  USER_REPOSITORY,
  VERIFICATION_TOKEN_REPOSITORY,
} from '../../common/constants/tokens';
import {
  AccountEntity,
  AlumniAcademicInformationEntity,
  AlumniContactRequestEntity,
  AlumniEntity,
  AlumniNotificationEntity,
  AlumniProfessionalInformationEntity,
  AlumniRegistrationRequestEntity,
  AlumniVerificationEntity,
  AnnouncementEntity,
  EventEntity,
  PortalMediaEntity,
  RoleEntity,
} from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MediaModule } from '../media/media.module';
import { AlumniDirectoryController } from './controllers/alumni-directory.controller';
import { AlumniMeController } from './controllers/alumni-me.controller';
import { AuthOnboardingController } from './controllers/auth-onboarding.controller';
import { PublicAlumniController } from './controllers/public-alumni.controller';
import { PublicRegistrationController } from './controllers/public-registration.controller';
import { IamRegistrationTenantsService } from '../auth/iam-registration-tenants.service';
import { InMemoryAlumniRepository } from './repositories/in-memory-alumni.repository';
import { InMemoryContactRequestRepository } from './repositories/in-memory-contact-request.repository';
import { InMemoryRegistrationRequestRepository } from './repositories/in-memory-registration-request.repository';
import {
  InMemoryVerificationTokenRepository,
} from './repositories/in-memory-supporting.repository';
import { InMemoryUserRepository } from './repositories/in-memory-user.repository';
import { TypeOrmAlumniRepository } from './repositories/typeorm-alumni.repository';
import { TypeOrmContactRequestRepository } from './repositories/typeorm-contact-request.repository';
import { TypeOrmRegistrationRequestRepository } from './repositories/typeorm-registration-request.repository';
import { TypeOrmUserRepository } from './repositories/typeorm-user.repository';
import { TypeOrmVerificationTokenRepository } from './repositories/typeorm-verification-token.repository';
import { ActivationService } from './services/activation.service';
import { AlumniDirectoryService } from './services/alumni-directory.service';
import { AlumniNotificationsService } from './services/alumni-notifications.service';
import { AlumniVerifyService } from './services/alumni-verify.service';
import { ContactRequestService } from './services/contact-request.service';
import { PasswordResetService } from './services/password-reset.service';
import { PhotoUploadService } from './services/photo-upload.service';
import { ProfileService } from './services/profile.service';
import { MeCareerService } from './services/me-career.service';
import { RegistrationService } from './services/registration.service';

const dbEnabled = process.env.DB_ENABLED !== 'false';

@Module({
  imports: [
    IntegrationsModule,
    MediaModule,
    forwardRef(() => AuthModule),
    ...(dbEnabled
      ? [
          TypeOrmModule.forFeature([
            AlumniRegistrationRequestEntity,
            AlumniEntity,
            AlumniAcademicInformationEntity,
            AlumniProfessionalInformationEntity,
            AlumniVerificationEntity,
            AlumniContactRequestEntity,
            AlumniNotificationEntity,
            AccountEntity,
            RoleEntity,
            PortalMediaEntity,
            EventEntity,
            AnnouncementEntity,
          ]),
        ]
      : []),
  ],
  controllers: [
    AuthOnboardingController,
    AlumniMeController,
    AlumniDirectoryController,
    PublicAlumniController,
    PublicRegistrationController,
  ],
  providers: [
    RegistrationService,
    ActivationService,
    PasswordResetService,
    ProfileService,
    MeCareerService,
    PhotoUploadService,
    AlumniDirectoryService,
    AlumniVerifyService,
    ContactRequestService,
    IamRegistrationTenantsService,
    ...(dbEnabled ? [AlumniNotificationsService] : []),
    {
      provide: REGISTRATION_REQUEST_REPOSITORY,
      useClass: dbEnabled
        ? TypeOrmRegistrationRequestRepository
        : InMemoryRegistrationRequestRepository,
    },
    {
      provide: ALUMNI_REPOSITORY,
      useClass: dbEnabled
        ? TypeOrmAlumniRepository
        : InMemoryAlumniRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: dbEnabled ? TypeOrmUserRepository : InMemoryUserRepository,
    },
    {
      provide: VERIFICATION_TOKEN_REPOSITORY,
      useClass: dbEnabled
        ? TypeOrmVerificationTokenRepository
        : InMemoryVerificationTokenRepository,
    },
    {
      provide: CONTACT_REQUEST_REPOSITORY,
      useClass: dbEnabled
        ? TypeOrmContactRequestRepository
        : InMemoryContactRequestRepository,
    },
  ],
  exports: [
    RegistrationService,
    ActivationService,
    PasswordResetService,
    ProfileService,
    MeCareerService,
    PhotoUploadService,
    AlumniDirectoryService,
    ContactRequestService,
    ...(dbEnabled ? [AlumniNotificationsService] : []),
    REGISTRATION_REQUEST_REPOSITORY,
    ALUMNI_REPOSITORY,
    USER_REPOSITORY,
    VERIFICATION_TOKEN_REPOSITORY,
    CONTACT_REQUEST_REPOSITORY,
  ],
})
export class AlumniModule {}
