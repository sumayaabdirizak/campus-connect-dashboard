import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import {
  approveClub,
  createClub,
  createClubAsDean,
  rejectClub,
  suspendClub,
} from './service';
import type { CreateClubPayload } from './types';
import { clubKeys } from './club-keys';

export function useCreateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClubPayload) => createClub(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.all });
      toast.success('Club application submitted! Waiting for dean approval.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create club'),
  });
}

export function useCreateClubAsDean() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClubPayload) => createClubAsDean(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.all });
      toast.success('Club created successfully!');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create club'),
  });
}

export function useApproveClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clubId: number) => approveClub(clubId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.pending() });
      qc.invalidateQueries({ queryKey: clubKeys.all });
      toast.success('Club approved!');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to approve club'),
  });
}

export function useRejectClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clubId, reason }: { clubId: number; reason?: string }) =>
      rejectClub(clubId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.pending() });
      toast.success('Club application rejected');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reject club'),
  });
}

export function useSuspendClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clubId, reason }: { clubId: number; reason?: string }) =>
      suspendClub(clubId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.all });
      toast.success('Club suspended');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to suspend club'),
  });
}
