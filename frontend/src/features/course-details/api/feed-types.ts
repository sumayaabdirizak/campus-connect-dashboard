export interface CoursePostAttachment {
  id: number;
  name: string;
  url: string;
  size: number | null;
  mimeType: string | null;
}

export interface CoursePostAuthor {
  id: number;
  full_name: string;
  role?: { name: string } | null;
}

export type CoursePostSource = 'MANUAL' | 'SESSION' | 'ATTENDANCE' | 'DEAN' | 'REGISTRATION';

export interface CoursePostReaction {
  id: number;
  userId: number;
  emoji: string;
}

export interface CoursePostReply {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  created_at: string;
  updated_at: string;
  author: CoursePostAuthor;
}

export interface CoursePost {
  id: number;
  courseOfferingId: number;
  authorId: number;
  source: CoursePostSource;
  sourceKey: string | null;
  title: string;
  content: string;
  isImportant: boolean;
  isPinned: boolean;
  created_at: string;
  updated_at: string;
  author: CoursePostAuthor;
  attachments: CoursePostAttachment[];
  reactions: CoursePostReaction[];
  replies: CoursePostReply[];
}

export interface CreateCoursePostInput {
  title: string;
  content: string;
  isImportant?: boolean;
  isPinned?: boolean;
  attachments?: Array<{ name: string; url: string; size?: number | null; mimeType?: string | null }>;
}

export interface UpdateCoursePostInput {
  title?: string;
  content?: string;
  isImportant?: boolean;
  isPinned?: boolean;
}
