export interface ClassSchedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  topic: string | null;
  courseOfferingId: number;
  is_lab: boolean;
  attendance?: AttendanceRecord[];
  _count?: { attendance: number };
}

export interface AttendanceRecord {
  id: number;
  scheduleId: number;
  studentId: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  student?: {
    id: number;
    full_name: string;
    email: string;
    number: string;
  };
  schedule?: {
    id: number;
    location: string;
    topic: string | null;
    start_time: string;
    end_time: string;
  };
}

export interface AttendanceSummaryStudent {
  studentId: number;
  full_name: string;
  number: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  recorded: number;
  ratePct: number;
}

export interface AttendanceSummary {
  totalSessions: number;
  avgRatePct: number;
  students: AttendanceSummaryStudent[];
}

export interface AttendanceStats {
  totalStudents: number;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
}

export interface CreateSessionData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  topic?: string;
  is_lab?: boolean;
}

export interface CreateRecordData {
  scheduleId: number;
  studentId: number;
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}

export interface UpdateRecordData {
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}

export interface AttendanceFilters {
  scheduleId?: string;
  studentId?: string;
}

export interface QrSession {
  sessionId: number;
  token: string;
  tokenTtlSeconds: number;
  endsAt: string;
  geofence: { lat: number; lon: number; radius: number } | null;
}

export interface QrTokenRefresh {
  token: string;
  tokenTtlSeconds: number;
  endsAt: string;
}

export interface StartQrSessionInput {
  scheduleId: number;
  durationMinutes?: number;
  lat?: number;
  lon?: number;
  radius?: number;
}

export interface ScanQrInput {
  token: string;
  lat?: number;
  lon?: number;
}

export interface ScanQrResult {
  success: boolean;
  attendanceId: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
}
