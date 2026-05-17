import { apiClient } from '@/lib/api-client';

export interface Program {
  id: number;
  name: string;
  code: string;
  level: 'UNDERGRADUATE' | 'POSTGRADUATE';
  departmentId: number;
  department?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ProgramsResponse {
  message: string;
  programs: Program[];
}

export const fetchPrograms = async () => {
  return apiClient<ProgramsResponse>('/programs');
};
