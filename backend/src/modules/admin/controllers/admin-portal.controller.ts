import {
  Body,
  Controller,
  Get,
  Inject,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { RegistrationStatus } from '../../../common/enums';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AlumniPermission } from '../../../common/auth/alumni-permissions';
import {
  ApiWrappedCreatedResponse,
  ApiWrappedOkOneOfResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/api-wrapped-response.decorator';
import { SWAGGER_TAGS } from '../../../common/swagger/swagger-tags';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthTokenResponseDto } from '../../alumni/dto/auth-response.dto';
import {
  AdminDashboardResponseDto,
  AdminLoginDto,
  ReviewRegistrationDto,
} from '../dto/admin.dto';
import {
  RegistrationApproveResponseDto,
  RegistrationDetailResponseDto,
  RegistrationListItemDto,
  RegistrationRejectResponseDto,
} from '../dto/admin-response.dto';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { ApprovalService } from '../services/approval.service';
import { RegistrationReviewService } from '../services/registration-review.service';
import { RejectionService } from '../services/rejection.service';

@Controller('admin')
export class AdminPortalController {
  constructor(
    private readonly authService: AuthService,
    private readonly reviewService: RegistrationReviewService,
    private readonly approvalService: ApprovalService,
    private readonly rejectionService: RejectionService,
    @Optional()
    @Inject(AdminDashboardService)
    private readonly dashboardService?: AdminDashboardService,
  ) {}

  @Post('auth/login')
  @ApiTags(SWAGGER_TAGS.AUTH_REGISTRATION)
  @ApiOperation({
    summary: 'Admin portal login via IAM (returns OAuth access token)',
  })
  @ApiWrappedCreatedResponse(AuthTokenResponseDto)
  async login(@Body() dto: AdminLoginDto) {
    const data = await this.authService.login(dto.email, dto.password, 'admin');
    return ApiResponseDto.of(
      {
        access_token: data.accessToken,
        role: data.role,
        user_id: data.userId,
      },
      'Admin login successful',
    );
  }

  @Get('dashboard')
  @ApiTags(SWAGGER_TAGS.DASHBOARD)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AlumniPermission.ADMIN_MEMBERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin dashboard statistics' })
  @ApiWrappedOkResponse(AdminDashboardResponseDto)
  async dashboard() {
    const data = this.dashboardService
      ? await this.dashboardService.getDashboard()
      : await this.reviewService.dashboard();
    return ApiResponseDto.of(data);
  }

  @Get('registrations')
  @ApiTags(SWAGGER_TAGS.AUTH_REGISTRATION)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AlumniPermission.ADMIN_MEMBERS_MANAGE)
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false, enum: RegistrationStatus })
  @ApiOperation({ summary: 'List registration requests' })
  @ApiWrappedOkResponse(RegistrationListItemDto, { isArray: true })
  async list(@Query('status') status?: RegistrationStatus) {
    const data = await this.reviewService.list(status);
    return ApiResponseDto.of(data);
  }

  @Get('registrations/:id')
  @ApiTags(SWAGGER_TAGS.AUTH_REGISTRATION)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AlumniPermission.ADMIN_MEMBERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registration detail' })
  @ApiWrappedOkResponse(RegistrationDetailResponseDto)
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.reviewService.detail(id);
    return ApiResponseDto.of(data);
  }

  @Patch('registrations/:id')
  @ApiTags(SWAGGER_TAGS.AUTH_REGISTRATION)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AlumniPermission.ADMIN_MEMBERS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or reject registration via status body',
  })
  @ApiWrappedOkOneOfResponse([
    RegistrationApproveResponseDto,
    RegistrationRejectResponseDto,
  ])
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthUser,
    @Body() dto: ReviewRegistrationDto,
  ) {
    if (dto.status === RegistrationStatus.APPROVED) {
      const data = await this.approvalService.approve(
        id,
        admin.userId,
        dto.cnic_national_id,
      );
      return ApiResponseDto.of(data, 'Registration approved');
    }

    const data = await this.rejectionService.reject(
      id,
      admin.userId,
      dto.rejection_reason ?? '',
      dto.cnic_national_id,
    );
    return ApiResponseDto.of(data, 'Registration rejected');
  }

  @Post('registrations/:id/resend-activation')
  @ApiTags(SWAGGER_TAGS.AUTH_REGISTRATION)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AlumniPermission.ADMIN_MEMBERS_MANAGE)
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Resend approval activation notification' })
  async resend(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.reviewService.resendNotification(id);
    return ApiResponseDto.of(data, 'Activation notification resent');
  }
}
