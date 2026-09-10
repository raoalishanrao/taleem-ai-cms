import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { SWAGGER_TAGS } from '../../../common/swagger/swagger-tags';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AlumniPermission } from '../../../common/auth/alumni-permissions';
import {
  ApiWrappedOkResponse,
  ApiWrappedPaginatedResponse,
} from '../../../common/swagger/api-wrapped-response.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AnnouncementListQueryDto } from '../dto/announcement.dto';
import { AnnouncementResponseDto } from '../dto/announcement-response.dto';
import { AnnouncementService } from '../services/announcement.service';

@ApiTags(SWAGGER_TAGS.ANNOUNCEMENTS)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @RequirePermissions(AlumniPermission.NEWS_READ)
  @ApiOperation({ summary: 'Published announcements feed' })
  @ApiWrappedPaginatedResponse(AnnouncementResponseDto)
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: AnnouncementListQueryDto,
  ) {
    const data = await this.announcementService.list(user.permissions, query);
    return ApiResponseDto.of(data);
  }

  @Get(':id')
  @RequirePermissions(AlumniPermission.NEWS_READ)
  @ApiOperation({ summary: 'Get announcement by id' })
  @ApiWrappedOkResponse(AnnouncementResponseDto)
  async getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.announcementService.getById(id, user.permissions);
    return ApiResponseDto.of(data);
  }
}
