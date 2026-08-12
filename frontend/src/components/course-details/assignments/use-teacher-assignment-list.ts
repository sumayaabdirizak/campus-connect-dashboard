'use client';

import { useMemo, useRef, useState } from 'react';
import { useAssignments } from '@/lib/course-details/queries/assignments-queries';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import type { AssignmentFormValues } from './create-assignment-form';
import { useTeacherAssignmentCreate } from './use-teacher-assignment-create';
import { useTeacherAssignmentMutations } from './use-teacher-assignment-mutations';

export type AssignmentListFilter = 'all' | 'live' | 'draft' | 'grading' | 'overdue';

export function useTeacherAssignmentList(courseId: string) {
  const { data: assignments = [], isLoading } = useAssignments(courseId);
  const [view, setView] = useState<'list' | 'submissions'>('list');
  const [search, setSearch] = useState('');
  const [assignmentListFilter, setAssignmentListFilter] =
    useState<AssignmentListFilter>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<number>>(
    new Set()
  );

  const toggleAssignmentSelect = (id: number) => {
    setSelectedAssignmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearAssignmentSelection = () => setSelectedAssignmentIds(new Set());

  const filteredAssignments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const now = new Date();
    return assignments.filter((a) => {
      const matchesSearch =
        !needle ||
        a.title.toLowerCase().includes(needle) ||
        (a.description ?? '').toLowerCase().includes(needle);
      if (!matchesSearch) return false;
      if (assignmentListFilter === 'live') return !a.is_draft;
      if (assignmentListFilter === 'draft') return a.is_draft;
      if (assignmentListFilter === 'grading') return (a.pendingGradingCount ?? 0) > 0;
      if (assignmentListFilter === 'overdue') return !a.is_draft && new Date(a.due_date) < now;
      return true;
    });
  }, [assignments, assignmentListFilter, search]);

  const listStats = {
    total: assignments.length,
    published: assignments.filter((a) => !a.is_draft).length,
    drafts: assignments.filter((a) => a.is_draft).length,
    overdue: assignments.filter((a) => !a.is_draft && new Date(a.due_date) < new Date())
      .length,
    pendingGrading: assignments.reduce((n, a) => n + (a.pendingGradingCount ?? 0), 0)
  };

  const editInitialValues = useMemo<Partial<AssignmentFormValues> | undefined>(() => {
    if (!editTarget) return undefined;
    const toLocal = (iso: string | null | undefined) =>
      iso ? new Date(iso).toISOString().slice(0, 16) : '';
    return {
      title: editTarget.title,
      description: editTarget.description ?? '',
      open_at: toLocal(editTarget.open_at),
      due_date: toLocal(editTarget.due_date),
      workMode: editTarget.workMode,
      gradingScope: editTarget.gradingScope,
      allowLate: (editTarget.lateWindowMinutes ?? 0) > 0,
      lateWindow: String(editTarget.lateWindowMinutes ?? 0),
      maxMarks: editTarget.maxMarks ?? 100
    };
  }, [editTarget]);

  const create = useTeacherAssignmentCreate({
    courseId,
    pendingFiles,
    fileInputRef,
    setCreateOpen,
    setPendingFiles
  });
  const mutations = useTeacherAssignmentMutations({
    courseId,
    selectedAssignmentIds,
    editTarget,
    setEditTarget,
    setSelectedAssignment,
    setView,
    clearAssignmentSelection
  });

  return {
    assignments,
    isLoading,
    view,
    setView,
    search,
    setSearch,
    assignmentListFilter,
    setAssignmentListFilter,
    selectedAssignment,
    createOpen,
    setCreateOpen,
    pendingFiles,
    fileInputRef,
    editTarget,
    setEditTarget,
    editInitialValues,
    selectedAssignmentIds,
    setSelectedAssignmentIds,
    toggleAssignmentSelect,
    clearAssignmentSelection,
    filteredAssignments,
    listStats,
    ...create,
    ...mutations
  };
}
