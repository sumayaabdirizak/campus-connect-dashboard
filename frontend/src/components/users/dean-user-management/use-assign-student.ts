'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  assignStudentToSection,
  fetchBatches,
  fetchBatchSections
} from '@/lib/users/services/dean-service';
import { fetchAcademicYears } from '@/lib/users/services';
import { toast } from 'sonner';

export function useAssignStudent(student: { id: number; full_name: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const { data: batches } = useQuery({
    queryKey: ['dean-batches'],
    queryFn: fetchBatches
  });

  const { data: sections } = useQuery({
    queryKey: ['dean-sections', batchId],
    queryFn: () => fetchBatchSections(Number(batchId)),
    enabled: !!batchId
  });

  const { data: yearsData } = useQuery({
    queryKey: ['academicYears'],
    queryFn: fetchAcademicYears
  });

  const selectedBatch = useMemo(
    () => (batches?.batches ?? []).find((b) => String(b.id) === batchId),
    [batches, batchId]
  );

  const yearSemester = useMemo(() => {
    const years = yearsData?.academicYears ?? [];
    const yearId = selectedBatch?.academicYearId;
    const year = years.find((y) => y.id === yearId);
    const semester = year?.semesters?.[0];
    return {
      academicYearId: year?.id ?? yearId ?? null,
      semesterId: semester?.id ?? null
    };
  }, [yearsData, selectedBatch]);

  const assignMutation = useMutation({
    mutationFn: assignStudentToSection,
    onSuccess: () => {
      toast.success(`${student.full_name} assigned successfully`);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Assignment failed');
    }
  });

  const handleAssign = () => {
    if (!batchId || !sectionId) {
      toast.error('Please select both batch and section');
      return;
    }
    if (!yearSemester.academicYearId || !yearSemester.semesterId) {
      toast.error('Could not resolve academic year / semester for this batch');
      return;
    }
    assignMutation.mutate({
      studentId: student.id,
      batchSectionId: Number(sectionId),
      academicYearId: yearSemester.academicYearId,
      semesterId: yearSemester.semesterId
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
    isPending: assignMutation.isPending
  };
}
