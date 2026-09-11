import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UploadMediaResponseDto } from '../../../common/dto/upload-media-response.dto';

export class UploadPhotoResponseDto extends UploadMediaResponseDto {}

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  full_name: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp_number?: string;

  @ApiProperty({ example: '35202-1234567-1' })
  @IsString()
  @Matches(/^\d{5}-\d{7}-\d$/, {
    message: 'cnic_national_id must match #####-#######-#',
  })
  cnic_national_id: string;

  @ApiProperty({
    description: 'degree_programs.id for campus+degree+program combo',
    example: '55555555-5555-4555-8555-555555555501',
  })
  @IsUUID()
  degree_program_id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  registration_roll_number: string;

  @ApiProperty({ example: '2021' })
  @IsString()
  @MaxLength(20)
  graduation_year: string;

  @ApiProperty({
    description: 'media_id from POST /auth/upload-photo (required)',
  })
  @IsUUID()
  media_id: string;

  @ApiProperty({
    description:
      'Institution (tenant) selected on the registration form — IAM tenant id (UUID-shaped opaque id)',
    example: '01a05ca4-a4ca-3bea-de69-63c8d12ea8cb',
  })
  @IsString()
  @Matches(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    { message: 'tenant_id must be a UUID-shaped identifier' },
  )
  tenant_id: string;
}

export class ActivateDto {
  @ApiProperty({ description: 'Activation token from email link' })
  @IsString()
  token: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Base64 RSA-OAEP-SHA256 encrypted password (frontend uses PASSWORD_PUBLIC_KEY)',
  })
  @IsString()
  @MinLength(1)
  password: string;
}

export class ResendActivationDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({
    example: 'base64-rsa-oaep-encrypted-password',
    description:
      'Base64 RSA-OAEP-SHA256 encrypted new password (frontend uses PASSWORD_PUBLIC_KEY)',
  })
  @IsString()
  @MinLength(1)
  password: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  secondry_address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date_of_birth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  linkedin_url?: string;

  @ApiPropertyOptional({
    description: 'media_id from POST /auth/upload-photo',
  })
  @IsOptional()
  @IsUUID()
  media_id?: string;
}
