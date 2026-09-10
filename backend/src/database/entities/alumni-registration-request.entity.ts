import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  REGISTRATION_STATUS_ENUM,
  RegistrationStatus,
} from '../../common/enums';
import { AccountEntity } from './account.entity';
import { AlumniEntity } from './alumni.entity';
import { DegreeProgramEntity } from './degree-program.entity';
import { PortalMediaEntity } from './portal-media.entity';

@Entity({ name: 'alumni_registration_request' })
@Index('UQ_alumni_registration_request_tenant_cnic', ['tenantId', 'cnicNationalId'], {
  unique: true,
})
@Index(
  'UQ_alumni_registration_request_tenant_reference',
  ['tenantId', 'referenceNumber'],
  { unique: true },
)
export class AlumniRegistrationRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    enumName: REGISTRATION_STATUS_ENUM,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @Column({ name: 'whatsapp_number', type: 'varchar', length: 20, nullable: true })
  whatsappNumber: string | null;

  @Column({ name: 'cnic_national_id', type: 'varchar', length: 15 })
  cnicNationalId: string;

  @Column({ name: 'degree_program_id', type: 'uuid' })
  degreeProgramId: string;

  @ManyToOne(() => DegreeProgramEntity, (dp) => dp.registrationRequests, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'degree_program_id' })
  degreeProgram: DegreeProgramEntity;

  @Column({ name: 'registration_roll_number', type: 'varchar', length: 50 })
  registrationRollNumber: string;

  @Column({ name: 'graduation_year', type: 'varchar', length: 20 })
  graduationYear: string;

  @Column({ name: 'reference_number', type: 'varchar', length: 32 })
  referenceNumber: string;

  @Column({ name: 'photo_media_id', type: 'uuid', nullable: true })
  photoMediaId: string | null;

  @ManyToOne(() => PortalMediaEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'photo_media_id' })
  photoMedia: PortalMediaEntity | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => AccountEntity, (account) => account.reviewedRequests, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedByAccount: AccountEntity | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => AlumniEntity, (alumni) => alumni.registrationRequest)
  alumni: AlumniEntity | null;
}
