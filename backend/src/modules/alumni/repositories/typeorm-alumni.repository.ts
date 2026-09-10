import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TenantContext } from '../../../common/auth/tenant-context';
import { AlumniStatus } from '../../../common/enums';
import {
  AlumniAcademicInformationEntity,
  AlumniEntity,
  AlumniProfessionalInformationEntity,
} from '../../../database/entities';
import {
  Alumni,
  AlumniAcademicInformation,
  AlumniProfessionalInformation,
  AlumniProfile,
} from '../entities/alumni.entity';
import {
  CreateAlumniInput,
  AlumniDirectoryFilterOptions,
  AlumniDirectoryFilters,
  AlumniDirectoryPage,
  IAlumniRepository,
} from '../interfaces/alumni.repository.interface';

@Injectable()
export class TypeOrmAlumniRepository implements IAlumniRepository {
  constructor(
    @InjectRepository(AlumniEntity)
    private readonly alumniRepo: Repository<AlumniEntity>,
    @InjectRepository(AlumniAcademicInformationEntity)
    private readonly academicRepo: Repository<AlumniAcademicInformationEntity>,
    @InjectRepository(AlumniProfessionalInformationEntity)
    private readonly professionalRepo: Repository<AlumniProfessionalInformationEntity>,
  ) {}

  private tenantId(explicit?: string | null): string {
    return explicit?.trim() || TenantContext.requireTenantId();
  }

  async create(input: CreateAlumniInput): Promise<AlumniProfile> {
    const tenantId = this.tenantId(input.tenantId);
    const alumni = this.alumniRepo.create({
      tenantId,
      userId: input.userId ?? null,
      registrationRequestId: input.registrationRequestId,
      status: AlumniStatus.ACTIVE,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      dateOfBirth: null,
      gender: null,
      phoneNumber: input.phoneNumber ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      cnicNationalId: input.cnicNationalId,
      address: null,
      secondryAddress: null,
      city: null,
      country: null,
      linkedinUrl: null,
      qrCode: '',
      publicAlumniCode: input.publicAlumniCode,
      photoMediaId: input.photoMediaId ?? null,
    });
    const saved = await this.alumniRepo.save(alumni);

    const academic = this.academicRepo.create({
      tenantId,
      alumniId: saved.id,
      degreeProgramId: input.academic.degreeProgramId,
      registrationRollNumber: input.academic.registrationRollNumber,
      registrationYear: input.academic.registrationYear ?? null,
      graduationYear: input.academic.graduationYear,
      cgpa:
        input.academic.cgpa !== undefined && input.academic.cgpa !== null
          ? String(input.academic.cgpa)
          : null,
    });
    await this.academicRepo.save(academic);

    return (await this.findById(saved.id))!;
  }

  async findById(id: string): Promise<AlumniProfile | null> {
    return this.toProfile(
      await this.alumniRepo.findOne({
        where: { id, tenantId: this.tenantId() },
        relations: {
          academicRecords: true,
          professionalRecords: true,
          photoMedia: true,
        },
      }),
    );
  }

  async findByPublicAlumniCode(code: string): Promise<AlumniProfile | null> {
    return this.toProfile(
      await this.alumniRepo.findOne({
        where: {
          publicAlumniCode: code.trim().toUpperCase(),
          tenantId: this.tenantId(),
        },
        relations: {
          academicRecords: true,
          professionalRecords: true,
          photoMedia: true,
        },
      }),
    );
  }

  async findByEmail(email: string): Promise<AlumniProfile | null> {
    return this.toProfile(
      await this.alumniRepo.findOne({
        where: { email: email.toLowerCase(), tenantId: this.tenantId() },
        relations: {
          academicRecords: true,
          professionalRecords: true,
          photoMedia: true,
        },
      }),
    );
  }

  async findByUserId(userId: string): Promise<AlumniProfile | null> {
    return this.toProfile(
      await this.alumniRepo.findOne({
        where: { userId, tenantId: this.tenantId() },
        relations: {
          academicRecords: true,
          professionalRecords: true,
          photoMedia: true,
        },
      }),
    );
  }

  async findByRegistrationRequestId(
    registrationRequestId: string,
  ): Promise<AlumniProfile | null> {
    return this.toProfile(
      await this.alumniRepo.findOne({
        where: { registrationRequestId, tenantId: this.tenantId() },
        relations: {
          academicRecords: true,
          professionalRecords: true,
          photoMedia: true,
        },
      }),
    );
  }

  async findAll(): Promise<AlumniProfile[]> {
    const rows = await this.alumniRepo.find({
      where: { tenantId: this.tenantId() },
      relations: {
        academicRecords: true,
        professionalRecords: true,
        photoMedia: true,
      },
      order: { createdAt: 'DESC' },
    });
    return rows
      .map((row) => this.toProfile(row))
      .filter((p): p is AlumniProfile => p !== null);
  }

  async searchDirectory(
    filters: AlumniDirectoryFilters,
  ): Promise<AlumniDirectoryPage> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const tenantId = this.tenantId();

    const qb = this.alumniRepo
      .createQueryBuilder('alumni')
      .where('alumni.tenantId = :tenantId', { tenantId })
      .andWhere('alumni.status = :status', { status: AlumniStatus.ACTIVE });

    this.applyDirectoryFilters(qb, filters);

    const total = await qb.clone().select('alumni.id').getCount();

    const rows = await qb
      .leftJoinAndSelect('alumni.academicRecords', 'academic')
      .leftJoinAndSelect('alumni.professionalRecords', 'professional')
      .leftJoinAndSelect('alumni.photoMedia', 'photoMedia')
      .orderBy('alumni.fullName', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    return {
      items: rows
        .map((row) => this.toProfile(row))
        .filter((p): p is AlumniProfile => p !== null),
      total,
      page,
      pageSize,
    };
  }

  async listDirectoryFilterOptions(): Promise<AlumniDirectoryFilterOptions> {
    const tenantId = this.tenantId();
    const cityRows = await this.alumniRepo
      .createQueryBuilder('alumni')
      .select('alumni.city', 'value')
      .where('alumni.tenantId = :tenantId', { tenantId })
      .andWhere('alumni.status = :status', { status: AlumniStatus.ACTIVE })
      .andWhere('alumni.city IS NOT NULL')
      .andWhere("TRIM(alumni.city) <> ''")
      .distinct(true)
      .orderBy('alumni.city', 'ASC')
      .getRawMany<{ value: string }>();

    const countryRows = await this.alumniRepo
      .createQueryBuilder('alumni')
      .select('alumni.country', 'value')
      .where('alumni.tenantId = :tenantId', { tenantId })
      .andWhere('alumni.status = :status', { status: AlumniStatus.ACTIVE })
      .andWhere('alumni.country IS NOT NULL')
      .andWhere("TRIM(alumni.country) <> ''")
      .distinct(true)
      .orderBy('alumni.country', 'ASC')
      .getRawMany<{ value: string }>();

    const yearRows = await this.academicRepo
      .createQueryBuilder('academic')
      .innerJoin('academic.alumni', 'alumni')
      .select('academic.graduationYear', 'value')
      .where('alumni.tenantId = :tenantId', { tenantId })
      .andWhere('alumni.status = :status', { status: AlumniStatus.ACTIVE })
      .andWhere('academic.graduationYear IS NOT NULL')
      .andWhere("TRIM(academic.graduationYear) <> ''")
      .distinct(true)
      .orderBy('academic.graduationYear', 'DESC')
      .getRawMany<{ value: string }>();

    return {
      cities: uniqueTrimmed(cityRows.map((row) => row.value)),
      countries: uniqueTrimmed(countryRows.map((row) => row.value)),
      graduationYears: uniqueTrimmed(yearRows.map((row) => row.value)).sort(
        (a, b) => Number(b) - Number(a) || b.localeCompare(a),
      ),
    };
  }

  private applyDirectoryFilters(
    qb: ReturnType<Repository<AlumniEntity>['createQueryBuilder']>,
    filters: AlumniDirectoryFilters,
  ) {
    if (filters.excludeAlumniId) {
      qb.andWhere('alumni.id != :excludeId', {
        excludeId: filters.excludeAlumniId,
      });
    }
    if (filters.name?.trim()) {
      qb.andWhere('LOWER(alumni.fullName) LIKE :name', {
        name: `%${filters.name.trim().toLowerCase()}%`,
      });
    }
    if (filters.city?.trim()) {
      qb.andWhere('LOWER(TRIM(alumni.city)) LIKE :city', {
        city: `%${filters.city.trim().toLowerCase()}%`,
      });
    }
    if (filters.country?.trim()) {
      qb.andWhere('LOWER(TRIM(alumni.country)) LIKE :country', {
        country: `%${filters.country.trim().toLowerCase()}%`,
      });
    }
    if (filters.graduationYear?.trim()) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM alumni_academic_information gy
          WHERE gy.alumni_id = alumni.id
            AND gy.tenant_id = alumni.tenant_id
            AND TRIM(gy.graduation_year) = :graduationYear
        )`,
        { graduationYear: filters.graduationYear.trim() },
      );
    }
    if (filters.degreeProgramId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM alumni_academic_information dp
          WHERE dp.alumni_id = alumni.id
            AND dp.tenant_id = alumni.tenant_id
            AND dp.degree_program_id = :degreeProgramId
        )`,
        { degreeProgramId: filters.degreeProgramId },
      );
    }
  }

  async updateAlumni(id: string, patch: Partial<Alumni>): Promise<Alumni> {
    const existing = await this.alumniRepo.findOne({
      where: { id, tenantId: this.tenantId() },
    });
    if (!existing) throw new Error(`Alumni ${id} not found`);

    if (patch.userId !== undefined) existing.userId = patch.userId;
    if (patch.registrationRequestId !== undefined)
      existing.registrationRequestId = patch.registrationRequestId;
    if (patch.status !== undefined) existing.status = patch.status;
    if (patch.fullName !== undefined) existing.fullName = patch.fullName;
    if (patch.email !== undefined) existing.email = patch.email.toLowerCase();
    if (patch.dateOfBirth !== undefined) {
      existing.dateOfBirth = patch.dateOfBirth
        ? this.toDateString(patch.dateOfBirth)
        : null;
    }
    if (patch.gender !== undefined) existing.gender = patch.gender;
    if (patch.phoneNumber !== undefined)
      existing.phoneNumber = patch.phoneNumber;
    if (patch.whatsappNumber !== undefined)
      existing.whatsappNumber = patch.whatsappNumber;
    if (patch.cnicNationalId !== undefined)
      existing.cnicNationalId = patch.cnicNationalId;
    if (patch.address !== undefined) existing.address = patch.address;
    if (patch.secondryAddress !== undefined)
      existing.secondryAddress = patch.secondryAddress;
    if (patch.city !== undefined) existing.city = patch.city;
    if (patch.country !== undefined) existing.country = patch.country;
    if (patch.linkedinUrl !== undefined) existing.linkedinUrl = patch.linkedinUrl;
    if (patch.qrCode !== undefined) existing.qrCode = patch.qrCode;
    if (patch.photoMediaId !== undefined) existing.photoMediaId = patch.photoMediaId;

    const saved = await this.alumniRepo.save(existing);
    const withMedia = await this.alumniRepo.findOne({
      where: { id: saved.id },
      relations: { photoMedia: true },
    });
    return this.toAlumniDomain(withMedia ?? saved);
  }

  async addAcademic(
    alumniId: string,
    data: Omit<
      AlumniAcademicInformation,
      'id' | 'alumniId' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<AlumniAcademicInformation> {
    const tenantId = this.tenantId();
    const row = this.academicRepo.create({
      tenantId,
      alumniId,
      degreeProgramId: data.degreeProgramId,
      registrationRollNumber: data.registrationRollNumber,
      registrationYear: data.registrationYear ?? null,
      graduationYear: data.graduationYear,
      cgpa: data.cgpa !== null && data.cgpa !== undefined ? String(data.cgpa) : null,
    });
    const saved = await this.academicRepo.save(row);
    return this.toAcademicDomain(saved);
  }

  async listAcademic(alumniId: string): Promise<AlumniAcademicInformation[]> {
    const rows = await this.academicRepo.find({
      where: { alumniId, tenantId: this.tenantId() },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => this.toAcademicDomain(row));
  }

  async findAcademicById(
    id: string,
  ): Promise<AlumniAcademicInformation | null> {
    const row = await this.academicRepo.findOne({
      where: { id, tenantId: this.tenantId() },
    });
    return row ? this.toAcademicDomain(row) : null;
  }

  async updateAcademic(
    id: string,
    patch: Partial<
      Omit<AlumniAcademicInformation, 'id' | 'alumniId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<AlumniAcademicInformation> {
    const existing = await this.academicRepo.findOne({
      where: { id, tenantId: this.tenantId() },
    });
    if (!existing) throw new Error(`Academic ${id} not found`);

    if (patch.degreeProgramId !== undefined)
      existing.degreeProgramId = patch.degreeProgramId;
    if (patch.registrationRollNumber !== undefined)
      existing.registrationRollNumber = patch.registrationRollNumber;
    if (patch.registrationYear !== undefined)
      existing.registrationYear = patch.registrationYear;
    if (patch.graduationYear !== undefined)
      existing.graduationYear = patch.graduationYear;
    if (patch.cgpa !== undefined) {
      existing.cgpa =
        patch.cgpa !== null && patch.cgpa !== undefined
          ? String(patch.cgpa)
          : null;
    }

    const saved = await this.academicRepo.save(existing);
    return this.toAcademicDomain(saved);
  }

  async deleteAcademic(id: string): Promise<void> {
    await this.academicRepo.delete({ id, tenantId: this.tenantId() });
  }

  async listProfessional(
    alumniId: string,
  ): Promise<AlumniProfessionalInformation[]> {
    const rows = await this.professionalRepo.find({
      where: { alumniId, tenantId: this.tenantId() },
      order: { startDate: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((row) => this.toProfessionalDomain(row));
  }

  async findProfessionalById(
    id: string,
  ): Promise<AlumniProfessionalInformation | null> {
    const row = await this.professionalRepo.findOne({
      where: { id, tenantId: this.tenantId() },
    });
    return row ? this.toProfessionalDomain(row) : null;
  }

  async findCurrentProfessional(
    alumniId: string,
  ): Promise<AlumniProfessionalInformation | null> {
    const row = await this.professionalRepo.findOne({
      where: { alumniId, endDate: IsNull(), tenantId: this.tenantId() },
      order: { startDate: 'DESC', createdAt: 'DESC' },
    });
    return row ? this.toProfessionalDomain(row) : null;
  }

  async createProfessional(
    alumniId: string,
    data: Omit<
      AlumniProfessionalInformation,
      'id' | 'alumniId' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<AlumniProfessionalInformation> {
    const row = this.professionalRepo.create({
      tenantId: this.tenantId(),
      alumniId,
      currentCompany: data.currentCompany ?? null,
      jobTitle: data.jobTitle ?? null,
      role: data.role ?? null,
      startDate: this.toDateString(data.startDate),
      endDate: data.endDate ? this.toDateString(data.endDate) : null,
    });
    const saved = await this.professionalRepo.save(row);
    return this.toProfessionalDomain(saved);
  }

  async updateProfessional(
    id: string,
    patch: Partial<
      Omit<
        AlumniProfessionalInformation,
        'id' | 'alumniId' | 'createdAt' | 'updatedAt'
      >
    >,
  ): Promise<AlumniProfessionalInformation> {
    const existing = await this.professionalRepo.findOne({
      where: { id, tenantId: this.tenantId() },
    });
    if (!existing) throw new Error(`Professional ${id} not found`);

    if (patch.currentCompany !== undefined)
      existing.currentCompany = patch.currentCompany;
    if (patch.jobTitle !== undefined) existing.jobTitle = patch.jobTitle;
    if (patch.role !== undefined) existing.role = patch.role;
    if (patch.startDate !== undefined)
      existing.startDate = this.toDateString(patch.startDate);
    if (patch.endDate !== undefined) {
      existing.endDate = patch.endDate
        ? this.toDateString(patch.endDate)
        : null;
    }

    const saved = await this.professionalRepo.save(existing);
    return this.toProfessionalDomain(saved);
  }

  async deleteProfessional(id: string): Promise<void> {
    await this.professionalRepo.delete({ id, tenantId: this.tenantId() });
  }

  private toProfile(entity: AlumniEntity | null): AlumniProfile | null {
    if (!entity) return null;
    return {
      alumni: this.toAlumniDomain(entity),
      academic: (entity.academicRecords ?? []).map((a) =>
        this.toAcademicDomain(a),
      ),
      professional: (entity.professionalRecords ?? []).map((p) =>
        this.toProfessionalDomain(p),
      ),
    };
  }

  private toAlumniDomain(entity: AlumniEntity): Alumni {
    return {
      id: entity.id,
      userId: entity.userId,
      registrationRequestId: entity.registrationRequestId,
      status: entity.status,
      fullName: entity.fullName,
      email: entity.email,
      dateOfBirth: entity.dateOfBirth ? new Date(entity.dateOfBirth) : null,
      gender: entity.gender,
      phoneNumber: entity.phoneNumber,
      whatsappNumber: entity.whatsappNumber,
      cnicNationalId: entity.cnicNationalId,
      address: entity.address,
      secondryAddress: entity.secondryAddress,
      city: entity.city,
      country: entity.country,
      linkedinUrl: entity.linkedinUrl,
      qrCode: entity.qrCode,
      publicAlumniCode: entity.publicAlumniCode,
      photoMediaId: entity.photoMediaId,
      photoMedia: entity.photoMedia
        ? {
            id: entity.photoMedia.id,
            publicUrl: entity.photoMedia.publicUrl,
            storageKey: entity.photoMedia.storageKey,
          }
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toAcademicDomain(
    entity: AlumniAcademicInformationEntity,
  ): AlumniAcademicInformation {
    return {
      id: entity.id,
      alumniId: entity.alumniId,
      degreeProgramId: entity.degreeProgramId,
      registrationRollNumber: entity.registrationRollNumber,
      registrationYear: entity.registrationYear,
      graduationYear: entity.graduationYear,
      cgpa: entity.cgpa !== null ? Number(entity.cgpa) : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toProfessionalDomain(
    entity: AlumniProfessionalInformationEntity,
  ): AlumniProfessionalInformation {
    return {
      id: entity.id,
      alumniId: entity.alumniId,
      currentCompany: entity.currentCompany,
      jobTitle: entity.jobTitle,
      role: entity.role,
      startDate: new Date(entity.startDate),
      endDate: entity.endDate ? new Date(entity.endDate) : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toDateString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}

function uniqueTrimmed(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}
