import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  ANNOUNCEMENT_CATEGORY_ENUM,
  AnnouncementCategory,
} from '../../common/enums';
import { AccountEntity } from './account.entity';
import { AlumniEntity } from './alumni.entity';
import { PortalMediaEntity } from './portal-media.entity';

@Entity({ name: 'announcements' })
export class AnnouncementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: AnnouncementCategory,
    enumName: ANNOUNCEMENT_CATEGORY_ENUM,
    default: AnnouncementCategory.ANNOUNCEMENT,
  })
  category: AnnouncementCategory;

  @Column({ name: 'featured_alumni_id', type: 'uuid', nullable: true })
  featuredAlumniId: string | null;

  @ManyToOne(() => AlumniEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'featured_alumni_id' })
  featuredAlumni: AlumniEntity | null;

  @Column({ name: 'image_media_id', type: 'uuid', nullable: true })
  imageMediaId: string | null;

  @ManyToOne(() => PortalMediaEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'image_media_id' })
  imageMedia: PortalMediaEntity | null;

  @Index('IDX_announcements_published')
  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished: boolean;

  @Column({
    name: 'published_at',
    type: 'timestamptz',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  publishedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: AccountEntity;
}
