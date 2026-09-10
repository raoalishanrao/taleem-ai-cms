import { Injectable } from '@nestjs/common';
import { AlumniRole } from '../../common/auth/alumni-permissions';
import { IamLoginBridgeService } from './iam-login-bridge.service';

/**
 * Portal login entrypoint — proxies to IAM and returns an OAuth access token
 * that JwtStrategy accepts (`type=oauth` + tenantId).
 */
@Injectable()
export class AuthService {
  constructor(private readonly iamLoginBridge: IamLoginBridgeService) {}

  async login(
    email: string,
    password: string,
    portal: 'alumni' | 'admin' = 'alumni',
  ): Promise<{
    accessToken: string;
    role: string;
    userId: string;
  }> {
    const result = await this.iamLoginBridge.loginWithPassword({
      email,
      passwordCipherOrPlain: password,
      portal,
    });

    return {
      accessToken: result.accessToken,
      userId: result.userId,
      // Keep legacy-ish short names for older UI labels, plus IAM codes.
      role:
        result.role === AlumniRole.ADMIN
          ? AlumniRole.ADMIN
          : AlumniRole.MEMBER,
    };
  }
}
