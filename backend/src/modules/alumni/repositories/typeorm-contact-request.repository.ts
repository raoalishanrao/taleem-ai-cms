import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContext } from '../../../common/auth/tenant-context';
import { ContactRequestStatus } from '../../../common/enums';
import { AlumniContactRequestEntity } from '../../../database/entities';
import {
  AlumniContactRequest,
  CreateContactRequestInput,
  IContactRequestRepository,
} from '../interfaces/contact-request.repository.interface';

@Injectable()
export class TypeOrmContactRequestRepository
  implements IContactRequestRepository
{
  constructor(
    @InjectRepository(AlumniContactRequestEntity)
    private readonly repo: Repository<AlumniContactRequestEntity>,
  ) {}

  private tenantId(): string {
    return TenantContext.requireTenantId();
  }

  async create(
    input: CreateContactRequestInput,
  ): Promise<AlumniContactRequest> {
    const saved = await this.repo.save(
      this.repo.create({
        tenantId: this.tenantId(),
        requesterAlumniId: input.requesterAlumniId,
        targetAlumniId: input.targetAlumniId,
        requestReason: input.requestReason.trim(),
        requestedFields: input.requestedFields,
        status: ContactRequestStatus.PENDING_ADMIN,
        adminId: null,
        rejectionReason: null,
      }),
    );
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<AlumniContactRequest | null> {
    const row = await this.repo.findOne({
      where: { id, tenantId: this.tenantId() },
    });
    return row ? this.toDomain(row) : null;
  }

  async findSentByRequester(
    requesterAlumniId: string,
  ): Promise<AlumniContactRequest[]> {
    const rows = await this.repo.find({
      where: { requesterAlumniId, tenantId: this.tenantId() },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findReceivedByTarget(
    targetAlumniId: string,
    status?: ContactRequestStatus,
  ): Promise<AlumniContactRequest[]> {
    const rows = await this.repo.find({
      where: status
        ? { targetAlumniId, status, tenantId: this.tenantId() }
        : { targetAlumniId, tenantId: this.tenantId() },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findAll(status?: ContactRequestStatus): Promise<AlumniContactRequest[]> {
    const rows = await this.repo.find({
      where: status
        ? { status, tenantId: this.tenantId() }
        : { tenantId: this.tenantId() },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findApprovedPair(
    requesterAlumniId: string,
    targetAlumniId: string,
  ): Promise<AlumniContactRequest | null> {
    const row = await this.repo.findOne({
      where: {
        requesterAlumniId,
        targetAlumniId,
        status: ContactRequestStatus.APPROVED,
        tenantId: this.tenantId(),
      },
      order: { updatedAt: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findActivePair(
    requesterAlumniId: string,
    targetAlumniId: string,
  ): Promise<AlumniContactRequest | null> {
    const row = await this.repo.findOne({
      where: {
        requesterAlumniId,
        targetAlumniId,
        tenantId: this.tenantId(),
        status: In([
          ContactRequestStatus.PENDING_ADMIN,
          ContactRequestStatus.APPROVED,
        ]),
      },
      order: { createdAt: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }

  async update(
    id: string,
    patch: Partial<AlumniContactRequest>,
  ): Promise<AlumniContactRequest> {
    const existing = await this.repo.findOne({
      where: { id, tenantId: this.tenantId() },
    });
    if (!existing) throw new Error(`Contact request ${id} not found`);
    Object.assign(existing, patch, { id: existing.id });
    return this.toDomain(await this.repo.save(existing));
  }

  private toDomain(entity: AlumniContactRequestEntity): AlumniContactRequest {
    return {
      id: entity.id,
      requesterAlumniId: entity.requesterAlumniId,
      targetAlumniId: entity.targetAlumniId,
      requestReason: entity.requestReason,
      requestedFields: entity.requestedFields ?? [],
      status: entity.status,
      adminId: entity.adminId,
      rejectionReason: entity.rejectionReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
