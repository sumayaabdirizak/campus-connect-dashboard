import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LookupProgram {
  id: number;
  name: string;
  code: string;
  level?: string;
  department: { id: number; name: string };
}

export interface LookupSemester {
  id: number;
  name: string;
  sequence: number;
}

export interface LookupAcademicYear {
  id: number;
  name: string;
  semesters: LookupSemester[];
}

export interface LookupDepartment {
  id: number;
  name: string;
  code: string;
  faculty?: { id: number; name: string };
}

// ── Fetchers ───────────────────────────────────────────────────────────────

const fetchPrograms = () =>
  apiClient<{ programs: LookupProgram[] }>('/programs');

const fetchAcademicYears = () =>
  apiClient<{ years: LookupAcademicYear[] }>('/academic-years');

const fetchDepartments = () =>
  apiClient<{ departments: LookupDepartment[] }>('/departments');

// ── Hooks ──────────────────────────────────────────────────────────────────

export const usePrograms = () =>
  useQuery({
    queryKey: ['lookup', 'programs'] as const,
    queryFn: fetchPrograms,
    staleTime: 5 * 60 * 1000
  });

export const useAcademicYears = () =>
  useQuery({
    queryKey: ['lookup', 'academic-years'] as const,
    queryFn: fetchAcademicYears,
    staleTime: 5 * 60 * 1000
  });

export const useDepartments = () =>
  useQuery({
    queryKey: ['lookup', 'departments'] as const,
    queryFn: fetchDepartments,
    staleTime: 5 * 60 * 1000
  });
