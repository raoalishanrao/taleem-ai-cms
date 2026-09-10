import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { SWAGGER_TAGS } from '../../../common/swagger/swagger-tags';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AlumniPermission } from '../../../common/auth/alumni-permissions';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GenerateAlumniCardDto } from '../dto/generate-alumni-card.dto';
import { AlumniCardService } from '../services/alumni-card.service';

@ApiTags(SWAGGER_TAGS.ALUMNI)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(AlumniPermission.ADMIN_MEMBERS_MANAGE)
@Controller('admin/alumni')
export class AdminAlumniCardController {
  constructor(private readonly alumniCardService: AlumniCardService) {}

  @Post(':id/card')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Generate digital alumni card',
  })
  async generateCard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateAlumniCardDto,
  ) {
    const data = await this.alumniCardService.generate(id, dto);
    return ApiResponseDto.of(data, 'Alumni card generated');
  }
}
