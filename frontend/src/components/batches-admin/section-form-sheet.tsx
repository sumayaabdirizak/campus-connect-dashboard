'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { adminBatchSectionsQueryKey, adminBatchesQueryKey, useAdminBatches } from '@/lib/batches-admin/queries';
import { createAdminBatchSection } from '@/lib/batches-admin/services';
import { BatchSearchSelect } from './batch-search-select';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBatchId?: number;
};

export function SectionFormSheet({ open, onOpenChange, defaultBatchId }: Props) {
  const [name, setName] = useState('');
  const [batchId, setBatchId] = useState(0);
  const { data } = useAdminBatches();
  const batches = data?.batches ?? [];
  const queryClient = useQueryClient();

  const batchOptions = useMemo(
    () =>
      batches.map((batch) => ({
        value: String(batch.id),
        label: batch.name,
        hint: batch.program?.code ?? batch.academicYear?.name
      })),
    [batches]
  );

  useEffect(() => {
    if (!open) return;
    setName('');
    setBatchId(defaultBatchId ?? 0);
  }, [open, defaultBatchId]);

  const mutation = useMutation({
    mutationFn: createAdminBatchSection,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminBatchesQueryKey });
      void queryClient.invalidateQueries({ queryKey: adminBatchSectionsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['batch-sections', variables.batchId] });
      showToast('success', 'Section created successfully');
      onOpenChange(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to create section')
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !batchId) {
      showToast('error', 'Section name and batch are required');
      return;
    }
    mutation.mutate({ name: name.trim(), batchId });
  };

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title='Create New Section'
      formId='section-form'
      submitLabel='Create New'
      submitting={mutation.isPending}
      submitDisabled={!name.trim() || !batchId}
    >
      <form id='section-form' onSubmit={submit} className='space-y-3'>
        <BatchSearchSelect
          label='Batch'
          required
          placeholder='Select'
          searchPlaceholder='Search batch...'
          value={batchId ? String(batchId) : ''}
          onChange={(id) => setBatchId(Number(id))}
          options={batchOptions}
          emptyMessage='No batches found.'
        />
        <div className='space-y-1.5'>
          <Label htmlFor='section-name'>
            Section name <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='section-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Section A'
            className='h-10 rounded-lg'
          />
        </div>
      </form>
    </PosFormModal>
  );
}
