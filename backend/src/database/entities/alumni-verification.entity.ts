import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  VERIFICATION_TOKEN_TYPE_ENUM,
  VerificationTokenType,
} from '../../common/enums';
import { AlumniEntity } from './alumni.entity';

@Entity({ name: 'alumni_verification' })
export class AlumniVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'alumni_id', type: 'uuid' })
  alumniId: string;

  @ManyToOne(() => AlumniEntity, (alumni) => alumni.verifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'alumni_id' })
  alumni: AlumniEntity;

  @Column({
    name: 'token_type',
    type: 'enum',
    enum: VerificationTokenType,
    enumName: VERIFICATION_TOKEN_TYPE_ENUM,
    default: VerificationTokenType.ACTIVATION,
  })
  tokenType: VerificationTokenType;

  @Index()
  @Column({ name: 'token_hash', type: 'varchar', length: 255, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
