import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
  ApiWrappedPaginatedResponse,
} from '../../../common/swagger/api-wrapped-response.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  CreateContactRequestDto,
  DirectoryQueryDto,
} from '../dto/contact-request.dto';
import {
  ContactRequestResponseDto,
  DirectoryAlumniCardDto,
  DirectoryFilterOptionsDto,
} from '../dto/directory-response.dto';
import { AlumniDirectoryService } from '../services/alumni-directory.service';
import { ContactRequestService } from '../services/contact-request.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(AlumniPermission.PORTAL_ACCESS)
@Controller()
export class AlumniDirectoryController {
  constructor(
    private readonly directoryService: AlumniDirectoryService,
    private readonly contactRequestService: ContactRequestService,
  ) {}

  @Get('directory')
  @RequirePermissions(AlumniPermission.DIRECTORY_READ)
  @ApiTags(SWAGGER_TAGS.ALUMNI)
  @ApiOperation({ summary: 'Paginated alumni directory with masked contacts' })
  @ApiWrappedPaginatedResponse(DirectoryAlumniCardDto)
  async listDirectory(
    @CurrentUser() user: AuthUser,
    @Query() query: DirectoryQueryDto,
  ) {
    const data = await this.directoryService.list(
      user.userId,
      query,
      user.permissions,
      user.email,
    );
    return ApiResponseDto.of(data);
  }

  @Get('directory/filter-options')
  @RequirePermissions(AlumniPermission.DIRECTORY_READ)
  @ApiTags(SWAGGER_TAGS.ALUMNI)
  @ApiOperation({
    summary: 'Distinct city, country, and graduation year values for directory filters',
  })
  @ApiWrappedOkResponse(DirectoryFilterOptionsDto)
  async listDirectoryFilterOptions() {
    const data = await this.directoryService.filterOptions();
    return ApiResponseDto.of(data);
  }

  @Get('directory/:alumniId')
  @RequirePermissions(AlumniPermission.DIRECTORY_READ)
  @ApiTags(SWAGGER_TAGS.ALUMNI)
  @ApiOperation({ summary: 'Alumni directory profile' })
  @ApiWrappedOkResponse(DirectoryAlumniCardDto)
  async getDirectoryProfile(
    @CurrentUser() user: AuthUser,
    @Param('alumniId', ParseUUIDPipe) alumniId: string,
  ) {
    const data = await this.directoryService.getOne(
      user.userId,
      alumniId,
      user.permissions,
      user.email,
    );
    return ApiResponseDto.of(data);
  }

  @Post('contact-requests')
  @ApiTags(SWAGGER_TAGS.CONTACT_REQUESTS)
  @ApiOperation({ summary: 'Submit contact request' })
  @ApiWrappedCreatedResponse(ContactRequestResponseDto)
  async createContactRequest(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateContactRequestDto,
  ) {
    const data = await this.contactRequestService.create(
      user.userId,
      dto.target_alumni_id,
      dto.request_reason,
      dto.requested_fields,
    );
    return ApiResponseDto.of(data, 'Contact request submitted');
  }

  @Get('contact-requests/sent')
  @ApiTags(SWAGGER_TAGS.CONTACT_REQUESTS)
  @ApiOperation({ summary: 'Contact requests sent by current alumnus' })
  @ApiWrappedOkResponse(ContactRequestResponseDto, { isArray: true })
  async listSent(@CurrentUser() user: AuthUser) {
    const data = await this.contactRequestService.listSent(user.userId);
    return ApiResponseDto.of(data);
  }
}
