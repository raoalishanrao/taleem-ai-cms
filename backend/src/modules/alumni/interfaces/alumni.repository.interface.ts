import {
  Alumni,
  AlumniAcademicInformation,
  AlumniProfessionalInformation,
  AlumniProfile,
} from '../entities/alumni.entity';

export interface CreateAlumniInput {
  tenantId?: string;
  registrationRequestId: string;
  fullName: string;
  email: string;
  userId?: string | null;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  cnicNationalId: string;
  photoMediaId?: string | null;
  publicAlumniCode: string;
  academic: {
    degreeProgramId: string;
    registrationRollNumber: string;
    graduationYear: string;
    registrationYear?: string | null;
    cgpa?: number | null;
  };
}

export interface AlumniDirectoryFilters {
  name?: string;
  graduationYear?: string;
  degreeProgramId?: string;
  city?: string;
  country?: string;
  excludeAlumniId?: string;
  page?: number;
  pageSize?: number;
}

export interface AlumniDirectoryPage {
  items: AlumniProfile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AlumniDirectoryFilterOptions {
  cities: string[];
  countries: string[];
  graduationYears: string[];
}

export interface IAlumniRepository {
  create(input: CreateAlumniInput): Promise<AlumniProfile>;
  findById(id: string): Promise<AlumniProfile | null>;
  findByPublicAlumniCode(code: string): Promise<AlumniProfile | null>;
  findByEmail(email: string): Promise<AlumniProfile | null>;
  findByUserId(userId: string): Promise<AlumniProfile | null>;
  findByRegistrationRequestId(
    registrationRequestId: string,
  ): Promise<AlumniProfile | null>;
  findAll(): Promise<AlumniProfile[]>;
  searchDirectory(filters: AlumniDirectoryFilters): Promise<AlumniDirectoryPage>;
  listDirectoryFilterOptions(): Promise<AlumniDirectoryFilterOptions>;
  updateAlumni(id: string, patch: Partial<Alumni>): Promise<Alumni>;
  addAcademic(
    alumniId: string,
    data: Omit<AlumniAcademicInformation, 'id' | 'alumniId' | 'createdAt' | 'updatedAt'>,
  ): Promise<AlumniAcademicInformation>;
  listAcademic(alumniId: string): Promise<AlumniAcademicInformation[]>;
  findAcademicById(id: string): Promise<AlumniAcademicInformation | null>;
  updateAcademic(
    id: string,
    patch: Partial<
      Omit<AlumniAcademicInformation, 'id' | 'alumniId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<AlumniAcademicInformation>;
  deleteAcademic(id: string): Promise<void>;
  listProfessional(alumniId: string): Promise<AlumniProfessionalInformation[]>;
  findProfessionalById(
    id: string,
  ): Promise<AlumniProfessionalInformation | null>;
  findCurrentProfessional(
    alumniId: string,
  ): Promise<AlumniProfessionalInformation | null>;
  createProfessional(
    alumniId: string,
    data: Omit<
      AlumniProfessionalInformation,
      'id' | 'alumniId' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<AlumniProfessionalInformation>;
  updateProfessional(
    id: string,
    patch: Partial<
      Omit<
        AlumniProfessionalInformation,
        'id' | 'alumniId' | 'createdAt' | 'updatedAt'
      >
    >,
  ): Promise<AlumniProfessionalInformation>;
  deleteProfessional(id: string): Promise<void>;
}
