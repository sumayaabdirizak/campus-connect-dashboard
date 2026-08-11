// ─────────────────────────────────────────────────────────────────────────────
// Access Control
// ─────────────────────────────────────────────────────────────────────────────

export interface CourseAccessRow {
  userId: number;
  lastSeenAt: string;
}

export interface PingResult {
  lastSeenAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessageSender {
  id: number;
  full_name: string;
}

export interface ChatReplyTo {
  id: number;
  content: string;
  senderId: number;
  sender: ChatMessageSender;
}

export interface ChatAttachment {
  id: number;
  messageId: number;
  name: string;
  url: string;
  size: number | null;
  mimeType: string | null;
  created_at: string;
}

export interface ChatMention {
  userId: number;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  replyToId: number | null;
  editedAt: string | null;
  created_at: string;
  sender: ChatMessageSender;
  replyTo?: ChatReplyTo | null;
  attachments: ChatAttachment[];
  mentions: ChatMention[];
}

export interface ChatRoom {
  id: number;
  name: string;
  courseOfferingId: string | null;
  messages: ChatMessage[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface ChatPresenceUser {
  userId: number;
  full_name: string;
}

export interface ChatTypingUser {
  userId: number;
  full_name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed / Course Posts
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Groups / Study Groups
// ─────────────────────────────────────────────────────────────────────────────

export type GroupMemberRole = 'LEADER' | 'MEMBER';

export interface CourseGroup {
  id: number;
  name: string;
  courseOfferingId: number;
  created_by_id: number;
  created_at: string;
  creator?: {
    id: number;
    full_name: string;
  };
  members: GroupMember[];
}

export interface GroupMember {
  id: number;
  groupId: number;
  memberId: number;
  role: GroupMemberRole;
  joined_at: string;
  member: {
    id: number;
    full_name: string;
    email: string;
    number: string;
  };
}

export interface GroupInfo {
  groupId: number;
  groupName: string;
  isLeader: boolean;
  members: {
    id: number;
    name: string;
    role: GroupMemberRole;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Question Bank
// ─────────────────────────────────────────────────────────────────────────────

export interface BankOption {
  id: number;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface BankQuestion {
  id: number;
  question_text: string;
  question_type: string;
  points: number;
  topic: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  is_active: boolean;
  created_at: string;
  courseOfferingId: number;
  moduleId: number | null;
  module?: any | null;
  bankOptions: BankOption[];
}

export interface CreateBankQuestionInput {
  question_text: string;
  question_type: string;
  points: number;
  topic?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  moduleId?: number | null;
  options?: Array<{
    option_text: string;
    is_correct: boolean;
    order_index?: number;
  }>;
}

export type UpdateBankQuestionInput = Partial<CreateBankQuestionInput> & {
  is_active?: boolean;
};

export interface BankQuestionFilters {
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  search?: string;
  moduleId?: number | 'none';
}

export interface BankTopicCount {
  name: string;
  count: number;
}

export interface ImportToQuizInput {
  questionIds: number[];
}

export interface GenerateQuestionsInput {
  prompt: string;
  sourceMaterial?: string;
  count: number;
  questionTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  points: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  options: Array<{
    option_text: string;
    is_correct: boolean;
  }>;
}

export interface GenerateQuestionsResponse {
  questions: GeneratedQuestion[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resources
// ─────────────────────────────────────────────────────────────────────────────

export type ResourceType =
  | 'SYLLABUS'
  | 'ASSIGNMENT'
  | 'LECTURE_NOTE'
  | 'VIDEO'
  | 'AUDIO'
  | 'EXTERNAL_LINK'
  | 'OTHER';

export interface Resource {
  id: number;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string;
  originalName: string | null;
  mimeType: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  courseId: number;
  courseOfferingId: number | null;
  moduleId: number | null;
  position: number;
  teacherId: number;
  created_at: string;
  updated_at: string;
  is_draft: boolean;
  teacher?: {
    id: number;
    full_name: string;
  };
}

export interface UploadResourceFileResult {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface CreateResourceData {
  title: string;
  description?: string;
  type?: ResourceType;
  url: string;
  originalName?: string | null;
  mimeType?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  teacherId: number;
  is_draft?: boolean;
  moduleId?: number | null;
}

export interface UpdateResourceData {
  title?: string;
  description?: string;
  type?: ResourceType;
  url?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_draft?: boolean;
  moduleId?: number | null;
  position?: number;
}

export interface ResourceFilters {
  search?: string;
  type?: 'all' | ResourceType;
  status?: 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ResourceProgressInput {
  watchedDelta: number;
  position: number;
  duration: number;
  started?: boolean;
  ended?: boolean;
}

export interface MyResourceProgress {
  watchedSeconds: number;
  durationSeconds: number;
  lastPositionSeconds: number;
  completed: boolean;
}

export interface ResourceAnalyticsRow {
  studentId: number;
  fullName: string;
  number: string;
  watchedSeconds: number;
  durationSeconds: number;
  percent: number;
  completed: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  started: boolean;
}

export interface ResourceAnalytics {
  summary: {
    totalStudents: number;
    viewers: number;
    completedCount: number;
    avgPercent: number;
  };
  rows: ResourceAnalyticsRow[];
}

export interface CourseModule {
  id: number;
  courseOfferingId: number;
  title: string;
  description: string | null;
  position: number;
  publishedAt: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateModuleData {
  title: string;
  description?: string | null;
  publishedAt?: string | null;
}

export interface UpdateModuleData {
  title?: string;
  description?: string | null;
  publishedAt?: string | null;
  position?: number;
}

export interface ReorderItem {
  id: number;
  moduleId?: number | null;
  position: number;
}
