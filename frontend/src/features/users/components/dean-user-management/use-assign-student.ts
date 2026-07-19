'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  assignStudentToSection,
  fetchBatches,
  fetchBatchSections,
} from '../../api/dean-service';
import { toast } from 'sonner';

export function useAssignStudent(student: { id: number; full_name: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: fetchBatches,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', batchId],
    queryFn: () => fetchBatchSections(Number(batchId)),
    enabled: !!batchId,
  });

  const assignMutation = useMutation({
    mutationFn: assignStudentToSection,
    onSuccess: () => {
      toast.success(`${student.full_name} assigned successfully!`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Assignment failed');
    },
  });

  const handleAssign = () => {
    if (!batchId || !sectionId) {
      toast.error('Please select both batch and section');
      return;
    }
    assignMutation.mutate({
      studentId: student.id,
      batchSectionId: Number(sectionId),
      registrationAcademicYearId: 1,
      currentAcademicYearId: 1,
      currentSemesterId: 1,
    });
  };

  return {
    open,
    setOpen,
    batchId,
    setBatchId,
    sectionId,
    setSectionId,
    batches: batches?.batches ?? [],
    sections: sections?.sections ?? [],
    handleAssign,
    isPending: assignMutation.isPending,
  };
}
