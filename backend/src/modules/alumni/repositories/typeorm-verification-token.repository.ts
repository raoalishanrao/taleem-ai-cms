import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { TenantContext } from '../../../common/auth/tenant-context';
import { VerificationTokenType } from '../../../common/enums';
import {
  AlumniEntity,
  AlumniVerificationEntity,
} from '../../../database/entities';
import {
  IVerificationTokenRepository,
  VerificationToken,
} from '../interfaces/supporting.repository.interface';

@Injectable()
export class TypeOrmVerificationTokenRepository
  implements IVerificationTokenRepository
{
  constructor(
    @InjectRepository(AlumniVerificationEntity)
    private readonly tokens: Repository<AlumniVerificationEntity>,
    @InjectRepository(AlumniEntity)
    private readonly alumni: Repository<AlumniEntity>,
  ) {}

  private tenantId(): string {
    return TenantContext.requireTenantId();
  }

  async create(input: {
    userId: string;
    alumniId?: string | null;
    tokenHash: string;
    tokenType: VerificationTokenType;
    expiresAt: Date;
  }): Promise<VerificationToken> {
    if (!input.alumniId) {
      throw new Error('alumniId is required to persist verification tokens');
    }

    const tenantId = this.tenantId();

    await this.tokens
      .createQueryBuilder()
      .delete()
      .from(AlumniVerificationEntity)
      .where('alumni_id = :alumniId', { alumniId: input.alumniId })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .andWhere('token_type = :tokenType', { tokenType: input.tokenType })
      .andWhere('used_at IS NULL')
      .execute();

    const saved = await this.tokens.save(
      this.tokens.create({
        tenantId,
        alumniId: input.alumniId,
        tokenType: input.tokenType,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        usedAt: null,
      }),
    );

    return this.toDomain(saved, input.userId, input.tokenType);
  }

  async findValidByHash(
    tokenHash: string,
    tokenType: VerificationTokenType,
  ): Promise<VerificationToken | null> {
    const entity = await this.tokens.findOne({
      where: {
        tokenHash,
        tokenType,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
        tenantId: this.tenantId(),
      },
      relations: { alumni: true },
    });
    if (!entity) return null;

    return this.toDomain(
      entity,
      entity.alumni?.userId ?? '',
      entity.tokenType,
    );
  }

  async markUsed(id: string): Promise<void> {
    await this.tokens.update(
      { id, tenantId: this.tenantId() },
      { usedAt: new Date() },
    );
  }

  async invalidateActiveForUser(
    userId: string,
    tokenType: VerificationTokenType,
  ): Promise<void> {
    const profile = await this.alumni.findOne({
      where: { userId, tenantId: this.tenantId() },
    });
    if (!profile) return;
    await this.tokens.update(
      {
        alumniId: profile.id,
        tokenType,
        usedAt: IsNull(),
        tenantId: this.tenantId(),
      },
      { usedAt: new Date() },
    );
  }

  private toDomain(
    entity: AlumniVerificationEntity,
    userId: string,
    tokenType: VerificationTokenType,
  ): VerificationToken {
    return {
      id: entity.id,
      userId,
      alumniId: entity.alumniId,
      tokenHash: entity.tokenHash,
      tokenType,
      expiresAt: entity.expiresAt,
      usedAt: entity.usedAt,
      createdAt: entity.createdAt,
    };
  }
}
