import type { Announcement, AnnouncementPriority, AnnouncementTargetType } from '../../api/types';
import type { CreateAnnouncementDTO } from '../../api/types';

export type ActiveDaysPreset = 'off' | '1' | '3' | '5' | '7';

export interface ImageFile {
  id: string;
  file?: File;
  preview: string;
  altText?: string;
}

export interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAnnouncementDTO | FormData) => Promise<void>;
  editingAnnouncement?: Announcement | null;
}

export type DeanBatchLite = {
  id: number | string;
  name: string;
  program?: {
    department?: { id: number | string; name: string };
    departmentId?: number | string;
  };
};

export type ChipOption = { id: string; name: string; hint?: string };

export type { Announcement, AnnouncementPriority, AnnouncementTargetType, CreateAnnouncementDTO };
