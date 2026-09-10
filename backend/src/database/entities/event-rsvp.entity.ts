import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { RSVP_STATUS_ENUM, RsvpStatus } from '../../common/enums';
import { AlumniEntity } from './alumni.entity';
import { EventEntity } from './event.entity';

@Entity({ name: 'event_rsvps' })
@Unique('UQ_event_rsvps_event_alumni', ['eventId', 'alumniId'])
export class EventRsvpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Index('IDX_event_rsvps_event_id')
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => EventEntity, (event) => event.rsvps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: EventEntity;

  @Index('IDX_event_rsvps_alumni_id')
  @Column({ name: 'alumni_id', type: 'uuid' })
  alumniId: string;

  @ManyToOne(() => AlumniEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alumni_id' })
  alumni: AlumniEntity;

  @Column({
    type: 'enum',
    enum: RsvpStatus,
    enumName: RSVP_STATUS_ENUM,
  })
  status: RsvpStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
