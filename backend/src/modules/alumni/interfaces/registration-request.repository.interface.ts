import { RegistrationStatus } from '../../../common/enums';
import { AlumniRegistrationRequest } from '../entities/alumni-registration-request.entity';

export interface CreateRegistrationRequestInput {
  tenantId?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  cnicNationalId: string;
  degreeProgramId: string;
  registrationRollNumber: string;
  graduationYear: string;
  photoMediaId?: string | null;
  referenceNumber: string;
}

export interface IRegistrationRequestRepository {
  create(
    input: CreateRegistrationRequestInput,
  ): Promise<AlumniRegistrationRequest>;
  findById(id: string): Promise<AlumniRegistrationRequest | null>;
  findByEmail(email: string): Promise<AlumniRegistrationRequest | null>;
  findByCnic(cnic: string): Promise<AlumniRegistrationRequest | null>;
  findAll(status?: RegistrationStatus): Promise<AlumniRegistrationRequest[]>;
  nextReferenceNumber(year?: number): Promise<string>;
  update(
    id: string,
    patch: Partial<AlumniRegistrationRequest>,
  ): Promise<AlumniRegistrationRequest>;
}
