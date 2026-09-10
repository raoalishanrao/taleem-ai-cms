import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { TenantContext } from '../../../common/auth/tenant-context';
import { RegistrationStatus } from '../../../common/enums';
import {
  degreeProgramNameFromSeed,
  formatDegreeProgramName,
} from '../../../common/utils';
import { AlumniRegistrationRequestEntity } from '../../../database/entities';
import { AlumniRegistrationRequest } from '../entities/alumni-registration-request.entity';
import {
  CreateRegistrationRequestInput,
  IRegistrationRequestRepository,
} from '../interfaces/registration-request.repository.interface';
import {
  formatAlumniReference,
  parseAlumniReferenceSequence,
} from '../utils/alumni-reference';

const REGISTRATION_RELATIONS: FindOptionsRelations<AlumniRegistrationRequestEntity> =
  {
    photoMedia: true,
    degreeProgram: {
      degree: true,
      program: true,
    },
  };

@Injectable()
export class TypeOrmRegistrationRequestRepository
  implements IRegistrationRequestRepository
{
  constructor(
    @InjectRepository(AlumniRegistrationRequestEntity)
    private readonly repo: Repository<AlumniRegistrationRequestEntity>,
  ) {}

  private tenantId(explicit?: string | null): string {
    return explicit?.trim() || TenantContext.requireTenantId();
  }

  async create(
    input: CreateRegistrationRequestInput,
  ): Promise<AlumniRegistrationRequest> {
    const tenantId = this.tenantId(input.tenantId);
    const entity = this.repo.create({
      tenantId,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phoneNumber: input.phoneNumber ?? null,
      status: RegistrationStatus.PENDING,
      whatsappNumber: input.whatsappNumber ?? null,
      cnicNationalId: input.cnicNationalId,
      degreeProgramId: input.degreeProgramId,
      registrationRollNumber: input.registrationRollNumber,
      graduationYear: input.graduationYear,
      referenceNumber: input.referenceNumber,
      photoMediaId: input.photoMediaId ?? null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(
      (await this.repo.findOne({
        where: { id: saved.id },
        relations: REGISTRATION_RELATIONS,
      })) ?? saved,
    );
  }

  async nextReferenceNumber(year = new Date().getFullYear()): Promise<string> {
    const prefix = `ALM-${year}-`;
    const tenantId = this.tenantId();
    const rows = await this.repo
      .createQueryBuilder('r')
      .select('r.reference_number', 'reference_number')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.reference_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('r.reference_number', 'DESC')
      .limit(1)
      .getRawMany<{ reference_number: string }>();

    const latest = parseAlumniReferenceSequence(rows[0]?.reference_number);
    return formatAlumniReference(year, (latest ?? 0) + 1);
  }

  async findById(id: string): Promise<AlumniRegistrationRequest | null> {
    const entity = await this.repo.findOne({
      where: { id, tenantId: this.tenantId() },
      relations: REGISTRATION_RELATIONS,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<AlumniRegistrationRequest | null> {
    const entity = await this.repo.findOne({
      where: { email: email.toLowerCase(), tenantId: this.tenantId() },
      order: { createdAt: 'DESC' },
      relations: REGISTRATION_RELATIONS,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCnic(cnic: string): Promise<AlumniRegistrationRequest | null> {
    const entity = await this.repo.findOne({
      where: { cnicNationalId: cnic, tenantId: this.tenantId() },
      relations: REGISTRATION_RELATIONS,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(
    status?: RegistrationStatus,
  ): Promise<AlumniRegistrationRequest[]> {
    const entities = await this.repo.find({
      where: status
        ? { status, tenantId: this.tenantId() }
        : { tenantId: this.tenantId() },
      order: { createdAt: 'DESC' },
      relations: REGISTRATION_RELATIONS,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async update(
    id: string,
    patch: Partial<AlumniRegistrationRequest>,
  ): Promise<AlumniRegistrationRequest> {
    const existing = await this.repo.findOne({
      where: { id, tenantId: this.tenantId() },
    });
    if (!existing) throw new Error(`Registration request ${id} not found`);
    Object.assign(existing, patch, { id: existing.id });
    const saved = await this.repo.save(existing);
    const withMedia = await this.repo.findOne({
      where: { id: saved.id },
      relations: REGISTRATION_RELATIONS,
    });
    return this.toDomain(withMedia ?? saved);
  }

  private toDomain(
    entity: AlumniRegistrationRequestEntity,
  ): AlumniRegistrationRequest {
    return {
      id: entity.id,
      fullName: entity.fullName,
      email: entity.email,
      phoneNumber: entity.phoneNumber,
      status: entity.status,
      whatsappNumber: entity.whatsappNumber,
      cnicNationalId: entity.cnicNationalId,
      degreeProgramId: entity.degreeProgramId,
      degreeProgramName:
        formatDegreeProgramName({
          degreeCode: entity.degreeProgram?.degree?.code,
          programName: entity.degreeProgram?.program?.name,
        }) ?? degreeProgramNameFromSeed(entity.degreeProgramId),
      registrationRollNumber: entity.registrationRollNumber,
      graduationYear: entity.graduationYear,
      referenceNumber: entity.referenceNumber,
      photoMediaId: entity.photoMediaId,
      photoMedia: entity.photoMedia
        ? {
            id: entity.photoMedia.id,
            publicUrl: entity.photoMedia.publicUrl,
            storageKey: entity.photoMedia.storageKey,
          }
        : null,
      reviewedBy: entity.reviewedBy,
      reviewedAt: entity.reviewedAt,
      rejectionReason: entity.rejectionReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
