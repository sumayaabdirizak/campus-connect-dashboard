import { apiClient } from '@/lib/api-client';
import { uploadJson } from '@/lib/upload-client';

export type ProfileAcademicUnit = {
  id: number;
  name: string;
  code?: string | null;
};

export type ProfileMe = {
  id: number;
  full_name: string;
  email: string;
  number?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  smsOptIn?: boolean;
  studentProfile?: {
    faculty?: ProfileAcademicUnit | null;
    department?: ProfileAcademicUnit | null;
    program?: ProfileAcademicUnit | null;
    student_number?: string;
    admission_year?: number;
  } | null;
  lecturerProfile?: {
    specialty?: string | null;
    department?: ProfileAcademicUnit | null;
  } | null;
  deanProfile?: {
    faculty?: ProfileAcademicUnit | null;
  } | null;
  faculties?: ProfileAcademicUnit[];
  officeMemberships?: {
    role: string;
    office: {
      id: number;
      name: string;
      slug: string;
      codePrefix: string;
      faculty?: ProfileAcademicUnit | null;
    };
  }[];
  scope?: {
    facultyId?: number | null;
    departmentId?: number | null;
    programId?: number | null;
  };
};

export const fetchProfileMe = () => apiClient<ProfileMe>('/users/me');

export const patchProfileSms = (smsOptIn: boolean) =>
  apiClient<ProfileMe>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ smsOptIn }),
  });

export const changeProfilePassword = (body: {
  currentPassword: string;
  newPassword: string;
}) =>
  apiClient<{ ok: boolean; message: string }>('/users/me/password', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export async function uploadProfileAvatar(file: File): Promise<ProfileMe> {
  const form = new FormData();
  form.append('avatar', file);
  return uploadJson<ProfileMe>('/users/me/avatar', form);
}

export const removeProfileAvatar = () =>
  apiClient<ProfileMe>('/users/me/avatar', { method: 'DELETE' });
