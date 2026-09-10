import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { SWAGGER_TAGS } from '../../../common/swagger/swagger-tags';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AlumniPermission } from '../../../common/auth/alumni-permissions';
import { ApiWrappedOkResponse } from '../../../common/swagger/api-wrapped-response.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  AdminAlumniQueryDto,
  AdminOutreachExportQueryDto,
} from '../dto/admin-alumni.dto';
import { AdminAlumniListResponseDto } from '../dto/admin-response.dto';
import { AdminAlumniAnalyticsService } from '../services/admin-alumni-analytics.service';

@ApiTags(SWAGGER_TAGS.ALUMNI)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(AlumniPermission.ADMIN_REPORTS_READ)
@Controller('admin/alumni')
export class AdminAlumniAnalyticsController {
  constructor(
    private readonly adminAlumniAnalyticsService: AdminAlumniAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List alumni with search/filters plus demographic and geographic analytics',
  })
  @ApiWrappedOkResponse(AdminAlumniListResponseDto)
  async list(@Query() query: AdminAlumniQueryDto) {
    const data = await this.adminAlumniAnalyticsService.list(query);
    return ApiResponseDto.of(data);
  }

  @Get('export/outreach')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary:
      'Export filtered alumni outreach CSV for WhatsApp/email campaigns',
  })
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportOutreach(
    @Query() query: AdminOutreachExportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.adminAlumniAnalyticsService.exportOutreachCsv(query);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="admin-alumni-outreach.csv"',
    );
    res.send(csv);
  }
}
