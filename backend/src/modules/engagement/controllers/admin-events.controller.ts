import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  UploadedFile,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
  CancelEventDto,
  CreateEventDto,
  EventListQueryDto,
  PostponeEventDto,
  UploadEventImageResponseDto,
  UpdateEventDto,
} from '../dto/event.dto';
import {
  AdminRsvpListItemDto,
  DeletedIdResponseDto,
  EventDetailResponseDto,
  EventResponseDto,
} from '../dto/event-response.dto';
import { EventService } from '../services/event.service';

@ApiTags(SWAGGER_TAGS.EVENTS)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(AlumniPermission.ADMIN_EVENTS_MANAGE)
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  @ApiOperation({ summary: 'Admin list events' })
  @ApiWrappedPaginatedResponse(EventDetailResponseDto)
  async list(@CurrentUser() user: AuthUser, @Query() query: EventListQueryDto) {
    const data = await this.eventService.list(user, query);
    return ApiResponseDto.of(data);
  }

  @Post()
  @ApiOperation({ summary: 'Create and publish an event' })
  @ApiWrappedCreatedResponse(EventResponseDto)
  async create(@CurrentUser() admin: AuthUser, @Body() dto: CreateEventDto) {
    const data = await this.eventService.create(admin.userId, dto);
    return ApiResponseDto.of(data, 'Event published');
  }

  @Post('upload-image')
  @ApiOperation({ summary: 'Upload event image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiWrappedCreatedResponse(UploadEventImageResponseDto)
  async uploadImage(
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    const data = await this.eventService.uploadImage(file);
    return ApiResponseDto.of(data, 'Image uploaded');
  }

  @Get(':id/manifest/export')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Export attendance manifest CSV' })
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportManifest(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const csv = await this.eventService.buildManifestCsv(id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="event-${id}-manifest.csv"`,
    );
    res.send(csv);
  }

  @Get(':id/rsvps')
  @ApiOperation({ summary: 'List RSVPs for an event' })
  @ApiWrappedOkResponse(AdminRsvpListItemDto, { isArray: true })
  async listRsvps(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.eventService.listRsvps(id);
    return ApiResponseDto.of(data);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel event (notify alumni if published, then delete)',
  })
  @ApiWrappedOkResponse(DeletedIdResponseDto)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelEventDto,
  ) {
    const data = await this.eventService.cancel(id, dto);
    return ApiResponseDto.of(data, 'Event cancelled');
  }

  @Post(':id/postpone')
  @ApiOperation({
    summary: 'Postpone a published event and notify alumni',
  })
  @ApiWrappedOkResponse(EventResponseDto)
  async postpone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostponeEventDto,
  ) {
    const data = await this.eventService.postpone(id, dto);
    return ApiResponseDto.of(data, 'Event postponed');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin get event by id' })
  @ApiWrappedOkResponse(EventDetailResponseDto)
  async getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.eventService.getById(id, user);
    return ApiResponseDto.of(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event' })
  @ApiWrappedOkResponse(EventResponseDto)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    const data = await this.eventService.update(id, dto);
    return ApiResponseDto.of(data, 'Event updated');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an event without notifying alumni' })
  @ApiWrappedOkResponse(DeletedIdResponseDto)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.eventService.remove(id);
    return ApiResponseDto.of(data, 'Event deleted');
  }
}
