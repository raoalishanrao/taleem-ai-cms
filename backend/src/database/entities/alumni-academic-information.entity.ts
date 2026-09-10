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
import { DegreeProgramEntity } from './degree-program.entity';

@Entity({ name: 'alumni_academic_information' })
export class AlumniAcademicInformationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'alumni_id', type: 'uuid' })
  alumniId: string;

  @ManyToOne(() => AlumniEntity, (alumni) => alumni.academicRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'alumni_id' })
  alumni: AlumniEntity;

  @Column({ name: 'degree_program_id', type: 'uuid' })
  degreeProgramId: string;

  @ManyToOne(() => DegreeProgramEntity, (dp) => dp.academicRecords, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'degree_program_id' })
  degreeProgram: DegreeProgramEntity;

  @Column({ name: 'registration_roll_number', type: 'varchar', length: 50 })
  registrationRollNumber: string;

  @Column({ name: 'registration_year', type: 'varchar', length: 20, nullable: true })
  registrationYear: string | null;

  @Column({ name: 'graduation_year', type: 'varchar', length: 20 })
  graduationYear: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  cgpa: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
