import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { SWAGGER_TAGS } from '../../../common/swagger/swagger-tags';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AlumniPermission } from '../../../common/auth/alumni-permissions';
import {
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
  ApiWrappedPaginatedResponse,
} from '../../../common/swagger/api-wrapped-response.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  AnnouncementListQueryDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  UploadAnnouncementImageResponseDto,
} from '../dto/announcement.dto';
import {
  AnnouncementResponseDto,
  DeletedAnnouncementResponseDto,
} from '../dto/announcement-response.dto';
import { AnnouncementService } from '../services/announcement.service';

@ApiTags(SWAGGER_TAGS.ANNOUNCEMENTS)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(AlumniPermission.ADMIN_NEWS_MANAGE)
@Controller('admin/announcements')
export class AdminAnnouncementsController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: 'Admin announcements feed' })
  @ApiWrappedPaginatedResponse(AnnouncementResponseDto)
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: AnnouncementListQueryDto,
  ) {
    const data = await this.announcementService.list(user.permissions, query);
    return ApiResponseDto.of(data);
  }

  @Post('upload-image')
  @ApiOperation({
    summary: 'Upload announcement image',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiWrappedCreatedResponse(UploadAnnouncementImageResponseDto)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    const data = await this.announcementService.uploadImage(file);
    return ApiResponseDto.of(data, 'Image uploaded');
  }

  @Post()
  @ApiOperation({
    summary:
      'Create announcement or alumni spotlight',
  })
  @ApiWrappedCreatedResponse(AnnouncementResponseDto)
  async create(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    const data = await this.announcementService.create(admin.userId, dto);
    return ApiResponseDto.of(data, 'Announcement created');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin get announcement by id' })
  @ApiWrappedOkResponse(AnnouncementResponseDto)
  async getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.announcementService.getById(id, user.permissions);
    return ApiResponseDto.of(data);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update announcement',
  })
  @ApiWrappedOkResponse(AnnouncementResponseDto)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    const data = await this.announcementService.update(id, dto);
    return ApiResponseDto.of(data, 'Announcement updated');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete announcement' })
  @ApiWrappedOkResponse(DeletedAnnouncementResponseDto)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.announcementService.remove(id);
    return ApiResponseDto.of(data, 'Announcement deleted');
  }
}
