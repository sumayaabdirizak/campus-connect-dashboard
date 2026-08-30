'use client';

import { toast } from 'sonner';
import {
  useCreateAssignment,
  useUploadAttachments
} from '@/lib/course-details/queries/assignments-queries';
import { useGroups } from '@/lib/course-details/queries/groups-queries';
import type { AssignmentFormValues } from './create-assignment-form';

type CreateSetters = {
  courseId: string;
  pendingFiles: File[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setCreateOpen: (v: boolean) => void;
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
};

export function useTeacherAssignmentCreate(s: CreateSetters) {
  const { data: groups = [] } = useGroups(s.courseId);
  const createMutation = useCreateAssignment(s.courseId);
  const uploadMutation = useUploadAttachments(s.courseId);

  const addPendingFiles = (files: File[]) => {
    if (files.length === 0) return;
    const oversized = files.find((f) => f.size > 25 * 1024 * 1024);
    if (oversized) {
      toast.error(`"${oversized.name}" exceeds the 25 MB limit`);
      return;
    }
    s.setPendingFiles((prev) => [...prev, ...files].slice(0, 10));
  };

  const handlePickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    addPendingFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const removePendingFile = (index: number) => {
    s.setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (values: AssignmentFormValues) => {
    if (values.workMode === 'GROUP' && groups.length === 0) {
      toast.error(
        'Create groups first — go to the Groups tab and add at least one group before creating a group assignment.'
      );
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        open_at: values.open_at ? new Date(values.open_at).toISOString() : null,
        due_date: new Date(values.due_date).toISOString(),
        workMode: values.workMode,
        gradingScope: values.gradingScope,
        lateWindowMinutes: values.allowLate ? Number(values.lateWindow) || 0 : 0,
        maxMarks: values.maxMarks
      });
      if (s.pendingFiles.length === 0) toast.success('Assignment created');
      else {
        try {
          const { count } = await uploadMutation.mutateAsync({
            assignmentId: created.id,
            files: s.pendingFiles
          });
          toast.success(
            `Assignment created · ${count} file${count === 1 ? '' : 's'} attached`
          );
        } catch (e) {
          toast.error(
            `Assignment saved, but file upload failed: ${e instanceof Error ? e.message : ''}`
          );
        }
      }
      s.setCreateOpen(false);
      s.setPendingFiles([]);
      if (s.fileInputRef.current) s.fileInputRef.current.value = '';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    }
  };

  return {
    handlePickFiles,
    addPendingFiles,
    removePendingFile,
    handleCreate,
    createPending: createMutation.isPending || uploadMutation.isPending
  };
}
