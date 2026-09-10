import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AlumniEntity } from './alumni.entity';

export enum AlumniNotificationType {
  ALUMNI = 'alumni',
  EVENT = 'event',
  ANNOUNCEMENT = 'announcement',
}

@Entity({ name: 'alumni_notifications' })
export class AlumniNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Index()
  @Column({ name: 'alumni_id', type: 'uuid' })
  alumniId: string;

  @ManyToOne(() => AlumniEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alumni_id' })
  alumni: AlumniEntity;

  @Column({
    type: 'varchar',
    length: 32,
  })
  type: AlumniNotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Index()
  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
