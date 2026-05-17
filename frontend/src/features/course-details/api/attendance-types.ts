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
  date: string;
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
