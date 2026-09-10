import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AlumniModule } from '../alumni/alumni.module';
import { AlumniAccessService } from './alumni-access.service';
import { AuthService } from './auth.service';
import { IamLoginBridgeService } from './iam-login-bridge.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordCryptoService } from './password-crypto.service';
import { TenantContextInterceptor } from './tenant-context.interceptor';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_ACCESS_SECRET',
          config.get<string>(
            'JWT_SECRET',
            'change-me-access-secret-min-32-chars',
          ),
        ),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') ??
            '15m') as `${number}m`,
        },
      }),
    }),
    forwardRef(() => AlumniModule),
  ],
  providers: [
    AuthService,
    IamLoginBridgeService,
    JwtStrategy,
    PasswordCryptoService,
    AlumniAccessService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    PasswordCryptoService,
    AlumniAccessService,
    IamLoginBridgeService,
  ],
})
export class AuthModule {}
