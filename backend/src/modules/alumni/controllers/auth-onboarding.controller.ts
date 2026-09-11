import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TenantContext } from '../../../common/auth/tenant-context';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { SWAGGER_TAGS } from '../../../common/swagger/swagger-tags';
import { ApiWrappedCreatedResponse } from '../../../common/swagger/api-wrapped-response.decorator';
import { AuthService } from '../../auth/auth.service';
import {
  ActivateAccountResponseDto,
  AuthTokenResponseDto,
  ForgotPasswordResponseDto,
  RegisterResponseDto,
  ResendActivationResponseDto,
  ResetPasswordResponseDto,
} from '../dto/auth-response.dto';
import {
  ActivateDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendActivationDto,
  ResetPasswordDto,
  UploadPhotoResponseDto,
} from '../dto/f001.dto';
import { ActivationService } from '../services/activation.service';
import { PasswordResetService } from '../services/password-reset.service';
import { PhotoUploadService } from '../services/photo-upload.service';
import { RegistrationService } from '../services/registration.service';

@ApiTags(SWAGGER_TAGS.AUTH_REGISTRATION)
@Controller('auth')
export class AuthOnboardingController {
  constructor(
    private readonly photoUploadService: PhotoUploadService,
    private readonly registrationService: RegistrationService,
    private readonly activationService: ActivationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly authService: AuthService,
  ) {}

  @Post('upload-photo')
  @ApiOperation({ summary: 'Upload alumni registration photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiWrappedCreatedResponse(UploadPhotoResponseDto)
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    const data = await this.photoUploadService.uploadTemp(file);
    return ApiResponseDto.of(data, 'Photo uploaded');
  }

  @Post('register')
  @ApiOperation({ summary: 'Submit alumni registration' })
  @ApiWrappedCreatedResponse(RegisterResponseDto)
  async register(@Body() dto: RegisterDto) {
    // Bind selected institution before email/CNIC uniqueness checks.
    return TenantContext.runAsync(dto.tenant_id, async () => {
      const data = await this.registrationService.register(dto);
      return ApiResponseDto.of(data, data.message);
    });
  }

  @Post('resend-activation')
  @ApiOperation({ summary: 'Resend activation link' })
  @ApiWrappedCreatedResponse(ResendActivationResponseDto)
  async resendActivation(@Body() dto: ResendActivationDto) {
    const data = await this.activationService.resendActivation(dto.email);
    return ApiResponseDto.of(data, 'Activation email resent');
  }

  @Post('activate')
  @ApiOperation({ summary: 'Return a reset token for setting password' })
  @ApiWrappedCreatedResponse(ActivateAccountResponseDto)
  async activate(@Body() dto: ActivateDto) {
    const data = await this.activationService.activate(dto.token);
    return ApiResponseDto.of(data, 'Account activated');
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token from email' })
  @ApiWrappedCreatedResponse(ResetPasswordResponseDto)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const data = await this.passwordResetService.resetPassword(
      dto.token,
      dto.password,
    );
    return ApiResponseDto.of(data, 'Password reset successful');
  }

  @Post('login')
  @ApiOperation({
    summary: 'Alumni portal login via IAM (returns OAuth access token)',
  })
  @ApiWrappedCreatedResponse(AuthTokenResponseDto)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto.email, dto.password, 'alumni');
    return ApiResponseDto.of(
      {
        access_token: data.accessToken,
        role: data.role,
        user_id: data.userId,
      },
      'Login successful',
    );
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiWrappedCreatedResponse(ForgotPasswordResponseDto)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.passwordResetService.forgotPassword(dto.email);
    return ApiResponseDto.of(data);
  }
}
