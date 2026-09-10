import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
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
  ApiWrappedOkResponse,
} from '../../../common/swagger/api-wrapped-response.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ContactRequestService } from '../../alumni/services/contact-request.service';
import {
  AdminContactRequestQueryDto,
  AdminContactReviewAction,
  AdminReviewContactRequestDto,
} from '../../alumni/dto/contact-request.dto';
import { ContactRequestResponseDto } from '../../alumni/dto/directory-response.dto';

@ApiTags(SWAGGER_TAGS.CONTACT_REQUESTS)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(AlumniPermission.ADMIN_MEMBERS_MANAGE)
@Controller('admin/contact-requests')
export class AdminContactRequestController {
  constructor(private readonly contactRequestService: ContactRequestService) {}

  @Get()
  @ApiOperation({ summary: 'List alumni contact requests' })
  @ApiWrappedOkResponse(ContactRequestResponseDto, { isArray: true })
  async list(@Query() query: AdminContactRequestQueryDto) {
    const data = await this.contactRequestService.listForAdmin(query.status);
    return ApiResponseDto.of(data);
  }

  @Patch(':id/:action')
  @ApiOperation({ summary: 'Admin approve or reject contact request' })
  @ApiParam({ name: 'action', enum: AdminContactReviewAction })
  @ApiWrappedOkResponse(ContactRequestResponseDto)
  async review(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action', new ParseEnumPipe(AdminContactReviewAction))
    action: AdminContactReviewAction,
    @Body() dto: AdminReviewContactRequestDto = {},
  ) {
    const data = await this.contactRequestService.reviewAsAdmin(
      admin.userId,
      id,
      action,
      dto.rejection_reason,
    );
    return ApiResponseDto.of(data, 'Contact request reviewed');
  }
}
