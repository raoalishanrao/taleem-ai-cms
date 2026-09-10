import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ALUMNI_REPOSITORY } from '../../../common/constants/tokens';
import {
  BusinessException,
  ResourceNotFoundException,
} from '../../../common/exceptions';
import { SEED_CATALOG } from '../../../database/seeds/catalog.seed';
import type {
  CreateAcademicDto,
  CreateProfessionalDto,
  UpdateAcademicDto,
  UpdateProfessionalDto,
} from '../dto/me-career.dto';
import type {
  AlumniAcademicInformation,
  AlumniProfessionalInformation,
} from '../entities/alumni.entity';
import type { IAlumniRepository } from '../interfaces/alumni.repository.interface';
import { ProfileService } from './profile.service';

@Injectable()
export class MeCareerService {
  private readonly logger = new Logger(MeCareerService.name);

  constructor(
    @Inject(ALUMNI_REPOSITORY)
    private readonly alumniRepository: IAlumniRepository,
    private readonly profileService: ProfileService,
  ) {}

  async listProfessional(userId: string, email?: string) {
    const alumniId = await this.requireAlumniId(userId, email);
    const rows = await this.alumniRepository.listProfessional(alumniId);
    return rows.map((row) => this.toProfessionalResponse(row));
  }

  async createProfessional(userId: string, dto: CreateProfessionalDto, email?: string) {
    const alumniId = await this.requireAlumniId(userId, email);
    const startDate = this.parseDate(dto.start_date, 'start_date');

    const current = await this.alumniRepository.findCurrentProfessional(alumniId);
    if (current) {
      this.assertDateOrder(
        current.startDate,
        startDate,
        'start_date must be on or after the previous job start_date',
      );
      await this.alumniRepository.updateProfessional(current.id, {
        endDate: startDate,
      });
    }

    const created = await this.alumniRepository.createProfessional(alumniId, {
      currentCompany: dto.current_company ?? null,
      jobTitle: dto.job_title ?? null,
      role: dto.role ?? null,
      startDate,
      endDate: null,
    });

    this.logger.log(
      `ALUMNI_PROFESSIONAL_CREATED alumniId=${alumniId} id=${created.id}`,
    );
    return this.toProfessionalResponse(created);
  }

  async updateProfessional(
    userId: string,
    id: string,
    dto: UpdateProfessionalDto,
    email?: string,
  ) {
    const alumniId = await this.requireAlumniId(userId, email);
    const existing = await this.requireOwnedProfessional(alumniId, id);

    const startDate = dto.start_date
      ? this.parseDate(dto.start_date, 'start_date')
      : existing.startDate;
    const endDate =
      dto.end_date === undefined
        ? existing.endDate
        : dto.end_date === null || dto.end_date === ''
          ? null
          : this.parseDate(dto.end_date, 'end_date');

    if (endDate) {
      this.assertDateOrder(
        startDate,
        endDate,
        'end_date must be on or after start_date',
      );
    }

    if (endDate === null) {
      const current = await this.alumniRepository.findCurrentProfessional(
        alumniId,
      );
      if (current && current.id !== id) {
        throw new BusinessException(
          'Another current job already exists; close it before clearing end_date',
        );
      }
    }

    const updated = await this.alumniRepository.updateProfessional(id, {
      currentCompany: dto.current_company,
      jobTitle: dto.job_title,
      role: dto.role,
      startDate: dto.start_date ? startDate : undefined,
      endDate: dto.end_date !== undefined ? endDate : undefined,
    });

    this.logger.log(
      `ALUMNI_PROFESSIONAL_UPDATED alumniId=${alumniId} id=${id}`,
    );
    return this.toProfessionalResponse(updated);
  }

  async deleteProfessional(userId: string, id: string, email?: string) {
    const alumniId = await this.requireAlumniId(userId, email);
    await this.requireOwnedProfessional(alumniId, id);
    await this.alumniRepository.deleteProfessional(id);
    this.logger.log(
      `ALUMNI_PROFESSIONAL_DELETED alumniId=${alumniId} id=${id}`,
    );
    return { id };
  }

  async listAcademic(userId: string, email?: string) {
    const alumniId = await this.requireAlumniId(userId, email);
    const rows = await this.alumniRepository.listAcademic(alumniId);
    const verificationId = this.verificationAcademicId(rows);
    return rows.map((row) =>
      this.toAcademicResponse(row, row.id === verificationId),
    );
  }

  async createAcademic(userId: string, dto: CreateAcademicDto, email?: string) {
    const alumniId = await this.requireAlumniId(userId, email);
    this.assertDegreeProgramExists(dto.degree_program_id);

    const created = await this.alumniRepository.addAcademic(alumniId, {
      degreeProgramId: dto.degree_program_id,
      registrationRollNumber: dto.registration_roll_number,
      registrationYear: dto.registration_year,
      graduationYear: dto.graduation_year,
      cgpa: dto.cgpa ?? null,
    });

    this.logger.log(
      `ALUMNI_ACADEMIC_CREATED alumniId=${alumniId} id=${created.id}`,
    );
    return this.toAcademicResponse(created, false);
  }

  async updateAcademic(
    userId: string,
    id: string,
    dto: UpdateAcademicDto,
    email?: string,
  ) {
    const alumniId = await this.requireAlumniId(userId, email);
    const existing = await this.requireOwnedAcademic(alumniId, id);
    await this.assertNotVerificationAcademic(alumniId, existing.id);

    if (dto.degree_program_id) {
      this.assertDegreeProgramExists(dto.degree_program_id);
    }

    const updated = await this.alumniRepository.updateAcademic(id, {
      degreeProgramId: dto.degree_program_id,
      registrationRollNumber: dto.registration_roll_number,
      registrationYear: dto.registration_year,
      graduationYear: dto.graduation_year,
      cgpa: dto.cgpa,
    });

    this.logger.log(`ALUMNI_ACADEMIC_UPDATED alumniId=${alumniId} id=${id}`);
    return this.toAcademicResponse(updated, false);
  }

  async deleteAcademic(userId: string, id: string, email?: string) {
    const alumniId = await this.requireAlumniId(userId, email);
    const existing = await this.requireOwnedAcademic(alumniId, id);
    await this.assertNotVerificationAcademic(alumniId, existing.id);
    await this.alumniRepository.deleteAcademic(id);
    this.logger.log(`ALUMNI_ACADEMIC_DELETED alumniId=${alumniId} id=${id}`);
    return { id };
  }

  private async requireAlumniId(
    userId: string,
    email?: string,
  ): Promise<string> {
    const profile = await this.profileService.resolveBoundProfile(
      userId,
      email,
    );
    if (!profile) {
      throw new ResourceNotFoundException('Alumni profile for user', userId);
    }
    return profile.alumni.id;
  }

  private async requireOwnedProfessional(
    alumniId: string,
    id: string,
  ): Promise<AlumniProfessionalInformation> {
    const row = await this.alumniRepository.findProfessionalById(id);
    if (!row || row.alumniId !== alumniId) {
      throw new ResourceNotFoundException('Professional information', id);
    }
    return row;
  }

  private async requireOwnedAcademic(
    alumniId: string,
    id: string,
  ): Promise<AlumniAcademicInformation> {
    const row = await this.alumniRepository.findAcademicById(id);
    if (!row || row.alumniId !== alumniId) {
      throw new ResourceNotFoundException('Academic information', id);
    }
    return row;
  }

  private async assertNotVerificationAcademic(
    alumniId: string,
    id: string,
  ): Promise<void> {
    const rows = await this.alumniRepository.listAcademic(alumniId);
    const verificationId = this.verificationAcademicId(rows);
    if (verificationId && verificationId === id) {
      throw new BusinessException(
        'Verification academic record cannot be updated or deleted',
        HttpStatus.FORBIDDEN,
        'ACADEMIC_VERIFICATION_LOCKED',
      );
    }
  }

  private verificationAcademicId(
    rows: AlumniAcademicInformation[],
  ): string | undefined {
    return [...rows].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )[0]?.id;
  }

  private assertDegreeProgramExists(degreeProgramId: string): void {
    const exists = SEED_CATALOG.degree_programs.some(
      (dp) => dp.id === degreeProgramId,
    );
    if (!exists) {
      throw new ResourceNotFoundException('Degree program', degreeProgramId);
    }
  }

  private parseDate(value: string, field: string): Date {
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BusinessException(`${field} must be YYYY-MM-DD`);
    }
    const date = new Date(`${normalized}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BusinessException(`${field} is not a valid date`);
    }
    return date;
  }

  private assertDateOrder(earlier: Date, later: Date, message: string): void {
    if (this.toDateKey(later) < this.toDateKey(earlier)) {
      throw new BusinessException(message);
    }
  }

  private toDateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private toProfessionalResponse(row: AlumniProfessionalInformation) {
    return {
      id: row.id,
      current_company: row.currentCompany,
      job_title: row.jobTitle,
      role: row.role,
      start_date: row.startDate,
      end_date: row.endDate,
    };
  }

  private toAcademicResponse(
    row: AlumniAcademicInformation,
    isVerification: boolean,
  ) {
    return {
      id: row.id,
      degree_program_id: row.degreeProgramId,
      registration_roll_number: row.registrationRollNumber,
      registration_year: row.registrationYear,
      graduation_year: row.graduationYear,
      cgpa: row.cgpa,
      is_verification: isVerification,
    };
  }
}
