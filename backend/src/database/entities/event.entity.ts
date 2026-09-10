import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  EVENT_LIFECYCLE_STATUS_ENUM,
  EVENT_TYPE_ENUM,
  EventLifecycleStatus,
  EventType,
} from '../../common/enums';
import { AccountEntity } from './account.entity';
import { EventRsvpEntity } from './event-rsvp.entity';
import { PortalMediaEntity } from './portal-media.entity';

export type EventTargetCriteria = {
  campus_ids?: string[];
  degree_program_ids?: string[];
  graduation_years?: number[];
  cities?: string[];
};

@Entity({ name: 'events' })
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: EventType,
    enumName: EVENT_TYPE_ENUM,
    default: EventType.OTHER,
  })
  eventType: EventType;

  @Index('IDX_events_event_date')
  @Column({ name: 'event_date', type: 'date' })
  eventDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string | null;

  @Column({ type: 'varchar', length: 255 })
  venue: string;

  @Column({ name: 'guest_speaker', type: 'varchar', length: 200, nullable: true })
  guestSpeaker: string | null;

  @Column({ name: 'image_media_id', type: 'uuid', nullable: true })
  imageMediaId: string | null;

  @ManyToOne(() => PortalMediaEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'image_media_id' })
  imageMedia: PortalMediaEntity | null;

  @Column({ name: 'is_draft', type: 'boolean', default: false })
  isDraft: boolean;

  @Column({
    name: 'status',
    type: 'enum',
    enum: EventLifecycleStatus,
    enumName: EVENT_LIFECYCLE_STATUS_ENUM,
    default: EventLifecycleStatus.SCHEDULED,
  })
  status: EventLifecycleStatus;

  @Column({ name: 'status_reason', type: 'text', nullable: true })
  statusReason: string | null;

  @Column({ name: 'target_criteria', type: 'jsonb', nullable: true, default: null })
  targetCriteria: EventTargetCriteria | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: AccountEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => EventRsvpEntity, (rsvp) => rsvp.event)
  rsvps: EventRsvpEntity[];
}
