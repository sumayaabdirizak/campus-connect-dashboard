export type OfficeThreadStatus = 'OPEN' | 'AWAITING_STUDENT' | 'RESOLVED';
export type OfficeStaffRole = 'AGENT' | 'MANAGER';

export interface SupportOffice {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  codePrefix: string;
  isActive?: boolean;
  createdAt?: string;
  facultyId?: number | null;
  faculty?: { id: number; name: string; code: string } | null;
  /** Set when the current user is staff of this office — unlocks the inbox. */
  myStaffRole?: OfficeStaffRole | null;
}

export interface OfficeStaffMember {
  id: number;
  officeId: number;
  userId: number;
  role: OfficeStaffRole;
  user: { id: number; full_name: string; email: string };
}

export interface OfficeMessage {
  id: number;
  content: string | null;
  createdAt: string;
  isInternalNote: boolean;
  sender: { id: number; full_name: string } | null;
  attachments: { id: number; url: string; mimeType: string }[];
}

export interface OfficeThreadSummary {
  id: number;
  officeId: number;
  studentId: number;
  topic: string;
  reference: string;
  status: OfficeThreadStatus;
  assignedToId: number | null;
  createdAt: string;
  updatedAt: string;
  office?: { name: string; slug: string };
  student?: { id: number; full_name: string; email: string };
  assignedTo?: { id: number; full_name: string } | null;
  lastMessage: { content: string | null; createdAt: string; senderId: number | null } | null;
}

export interface OfficeThreadDetail extends Omit<OfficeThreadSummary, 'lastMessage'> {
  office: { id: number; name: string; slug: string };
  student: { id: number; full_name: string; email: string; role?: { name: string } | null };
  assignedTo: { id: number; full_name: string } | null;
  /** Whether the CALLER is staff of this office (drives staff-only UI). */
  isStaff: boolean;
  /** Caller's office staff role, if any. */
  staffRole?: OfficeStaffRole | null;
  /** True when caller is MANAGER of this office. */
  isManager?: boolean;
  /** AO/SA ↔ support desk — chat UI, not student ticket. */
  isOfficeToOffice?: boolean;
  messages: OfficeMessage[];
}
