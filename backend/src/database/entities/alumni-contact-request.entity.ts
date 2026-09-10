import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CONTACT_REQUEST_STATUS_ENUM,
  ContactRequestStatus,
} from '../../common/enums';
import { AccountEntity } from './account.entity';
import { AlumniEntity } from './alumni.entity';

@Entity({ name: 'alumni_contact_requests' })
export class AlumniContactRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Index()
  @Column({ name: 'requester_alumni_id', type: 'uuid' })
  requesterAlumniId: string;

  @ManyToOne(() => AlumniEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_alumni_id' })
  requesterAlumni: AlumniEntity;

  @Index()
  @Column({ name: 'target_alumni_id', type: 'uuid' })
  targetAlumniId: string;

  @ManyToOne(() => AlumniEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_alumni_id' })
  targetAlumni: AlumniEntity;

  @Column({ name: 'request_reason', type: 'text' })
  requestReason: string;

  @Column({
    name: 'requested_fields',
    type: 'text',
    array: true,
    default: '{}',
  })
  requestedFields: string[];

  @Column({
    type: 'enum',
    enum: ContactRequestStatus,
    enumName: CONTACT_REQUEST_STATUS_ENUM,
    default: ContactRequestStatus.PENDING_ADMIN,
  })
  status: ContactRequestStatus;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string | null;

  @ManyToOne(() => AccountEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin: AccountEntity | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
