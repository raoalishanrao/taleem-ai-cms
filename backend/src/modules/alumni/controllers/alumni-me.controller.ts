import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { SWAGGER_TAGS } from '../../../common/swagger/swagger-tags';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AlumniPermission } from '../../../common/auth/alumni-permissions';
import {
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/api-wrapped-response.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpdateProfileDto } from '../dto/f001.dto';
import {
  CreateAcademicDto,
  CreateProfessionalDto,
  UpdateAcademicDto,
  UpdateProfessionalDto,
} from '../dto/me-career.dto';
import {
  AlumniProfileResponseDto,
  IdResponseDto,
  ProfileAcademicItemDto,
  ProfileProfessionalItemDto,
} from '../dto/me-response.dto';
import { MeCareerService } from '../services/me-career.service';
import { ProfileService } from '../services/profile.service';
import { AlumniNotificationsService } from '../services/alumni-notifications.service';
import {
  NotificationsSummaryDto,
  MarkNotificationsReadDto,
} from '../dto/notifications.dto';

@ApiTags(SWAGGER_TAGS.PROFILE_CAREER)
@Controller('me')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(AlumniPermission.PORTAL_ACCESS)
@ApiBearerAuth()
export class AlumniMeController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly meCareerService: MeCareerService,
    @Optional()
    private readonly notificationsService?: AlumniNotificationsService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get my alumni profile' })
  @ApiWrappedOkResponse(AlumniProfileResponseDto)
  async getProfile(@CurrentUser() user: AuthUser) {
    const data = await this.profileService.getMyProfile(
      user.userId,
      user.email,
    );
    return ApiResponseDto.of(data);
  }

  @Get('photo')
  @ApiOperation({
    summary: 'Download my profile photo (same-origin proxy for PDF/canvas)',
  })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @Header('Cache-Control', 'private, max-age=300')
  async getPhoto(@CurrentUser() user: AuthUser): Promise<StreamableFile> {
    const { buffer, contentType } = await this.profileService.getMyPhotoBytes(
      user.userId,
      user.email,
    );
    return new StreamableFile(buffer, {
      type: contentType,
      disposition: 'inline; filename="profile-photo"',
    });
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update my editable personal/contact profile fields' })
  @ApiWrappedOkResponse(AlumniProfileResponseDto)
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.profileService.updateMyProfile(
      user.userId,
      dto,
      user.email,
    );
    return ApiResponseDto.of(data, 'Profile updated');
  }

  @Get('notifications')
  @ApiOperation({
    summary: 'List alumni notifications with unread counts (persisted)',
  })
  @ApiWrappedOkResponse(NotificationsSummaryDto)
  async getNotifications(@CurrentUser() user: AuthUser) {
    if (!this.notificationsService) {
      return ApiResponseDto.of({
        unread_count: 0,
        alumni: 0,
        events: 0,
        announcements: 0,
        since: new Date(),
        items: [],
      });
    }
    const data = await this.notificationsService.getSummary(user.userId);
    return ApiResponseDto.of(data);
  }

  @Post('notifications/read')
  @ApiOperation({ summary: 'Mark notifications as read (all or selected ids)' })
  @ApiWrappedOkResponse(NotificationsSummaryDto)
  async markNotificationsRead(
    @CurrentUser() user: AuthUser,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    if (!this.notificationsService) {
      return ApiResponseDto.of({
        unread_count: 0,
        alumni: 0,
        events: 0,
        announcements: 0,
        since: new Date(),
        items: [],
      });
    }
    await this.notificationsService.markRead(
      user.userId,
      dto.notification_ids,
    );
    const data = await this.notificationsService.getSummary(user.userId);
    return ApiResponseDto.of(data, 'Notifications marked as read');
  }

  @Get('professional')
  @ApiOperation({ summary: 'List my professional information records' })
  @ApiWrappedOkResponse(ProfileProfessionalItemDto, { isArray: true })
  async listProfessional(@CurrentUser() user: AuthUser) {
    const data = await this.meCareerService.listProfessional(user.userId, user.email);
    return ApiResponseDto.of(data);
  }

  @Post('professional')
  @ApiOperation({ summary: 'Add a current job' })
  @ApiWrappedCreatedResponse(ProfileProfessionalItemDto)
  async createProfessional(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProfessionalDto,
  ) {
    const data = await this.meCareerService.createProfessional(
      user.userId,
      dto,
      user.email,
    );
    return ApiResponseDto.of(data, 'Professional information created');
  }

  @Put('professional/:id')
  @ApiOperation({ summary: 'Update one of my professional information records' })
  @ApiWrappedOkResponse(ProfileProfessionalItemDto)
  async updateProfessional(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    const data = await this.meCareerService.updateProfessional(
      user.userId,
      id,
      dto,
      user.email,
    );
    return ApiResponseDto.of(data, 'Professional information updated');
  }

  @Delete('professional/:id')
  @ApiOperation({ summary: 'Delete one of my professional information records' })
  @ApiWrappedOkResponse(IdResponseDto)
  async deleteProfessional(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.meCareerService.deleteProfessional(user.userId, id, user.email);
    return ApiResponseDto.of(data, 'Professional information deleted');
  }

  @Get('academic')
  @ApiOperation({ summary: 'List my academic information records' })
  @ApiWrappedOkResponse(ProfileAcademicItemDto, { isArray: true })
  async listAcademic(@CurrentUser() user: AuthUser) {
    const data = await this.meCareerService.listAcademic(user.userId, user.email);
    return ApiResponseDto.of(data);
  }

  @Post('academic')
  @ApiOperation({ summary: 'Add an additional academic information record' })
  @ApiWrappedCreatedResponse(ProfileAcademicItemDto)
  async createAcademic(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAcademicDto,
  ) {
    const data = await this.meCareerService.createAcademic(user.userId, dto, user.email);
    return ApiResponseDto.of(data, 'Academic information created');
  }

  @Put('academic/:id')
  @ApiOperation({ summary: 'Update an academic information record' })
  @ApiWrappedOkResponse(ProfileAcademicItemDto)
  async updateAcademic(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicDto,
  ) {
    const data = await this.meCareerService.updateAcademic(
      user.userId,
      id,
      dto,
      user.email,
    );
    return ApiResponseDto.of(data, 'Academic information updated');
  }

  @Delete('academic/:id')
  @ApiOperation({ summary: 'Delete an academic information record' })
  @ApiWrappedOkResponse(IdResponseDto)
  async deleteAcademic(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.meCareerService.deleteAcademic(user.userId, id, user.email);
    return ApiResponseDto.of(data, 'Academic information deleted');
  }
}
