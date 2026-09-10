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
import { AlumniEntity } from './alumni.entity';

@Entity({ name: 'alumni_professional_information' })
export class AlumniProfessionalInformationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'alumni_id', type: 'uuid' })
  alumniId: string;

  @ManyToOne(() => AlumniEntity, (alumni) => alumni.professionalRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'alumni_id' })
  alumni: AlumniEntity;

  @Column({ name: 'current_company', type: 'varchar', length: 150, nullable: true })
  currentCompany: string | null;

  @Column({ name: 'job_title', type: 'varchar', length: 150, nullable: true })
  jobTitle: string | null;

  @Column({ name: 'role', type: 'varchar', length: 150, nullable: true })
  role: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
