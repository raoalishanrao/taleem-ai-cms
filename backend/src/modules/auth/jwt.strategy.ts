import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { BusinessException } from '../../common/exceptions';
import { AlumniAccessService } from './alumni-access.service';

interface OauthJwtPayload {
  sub: string;
  email: string;
  tenantId?: string;
  clientId?: string;
  scope?: string;
  sessionId?: string;
  type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly alumniAccessService: AlumniAccessService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_ACCESS_SECRET ??
        process.env.JWT_SECRET ??
        'change-me-access-secret-min-32-chars',
    });
  }

  async validate(payload: OauthJwtPayload): Promise<AuthUser> {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid access token');
    }

    if (payload.type !== 'oauth') {
      throw new BusinessException(
        'OAuth access token required',
        HttpStatus.UNAUTHORIZED,
        'INVALID_TOKEN_TYPE',
      );
    }

    const tenantId = payload.tenantId?.trim();
    if (!tenantId) {
      throw new BusinessException(
        'tenantId claim is required',
        HttpStatus.UNAUTHORIZED,
        'TENANT_REQUIRED',
      );
    }

    const access = await this.alumniAccessService.resolveAccess(
      payload.sub,
      tenantId,
    );

    if (access.roles.length === 0) {
      throw new BusinessException(
        'No Alumni application access for this tenant',
        HttpStatus.FORBIDDEN,
        'ALUMNI_ACCESS_REQUIRED',
      );
    }

    return {
      userId: payload.sub,
      email: payload.email,
      tenantId,
      clientId: payload.clientId,
      scope: payload.scope,
      sessionId: payload.sessionId,
      roles: access.roles,
      permissions: access.permissions,
    };
  }
}
