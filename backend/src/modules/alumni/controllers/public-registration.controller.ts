import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import {
  IamRegistrationTenantsService,
  type RegistrationTenantDto,
} from '../../auth/iam-registration-tenants.service';

class RegistrationTenantResponseDto implements RegistrationTenantDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() displayName!: string;
}

@ApiTags('Public Registration')
@Controller('public')
export class PublicRegistrationController {
  constructor(
    private readonly iamRegistrationTenants: IamRegistrationTenantsService,
  ) {}

  @Get('tenants-for-registration')
  @ApiOperation({
    summary:
      'List institutions available for alumni signup (proxies IAM with server API key)',
  })
  @ApiOkResponse({ type: [RegistrationTenantResponseDto] })
  async listTenants(
    @Query('applicationCode') applicationCode?: string,
  ): Promise<ApiResponseDto<RegistrationTenantDto[]>> {
    const data = await this.iamRegistrationTenants.listForRegistration(
      applicationCode?.trim() || 'ALUMNI',
    );
    return ApiResponseDto.of(data);
  }
}
