import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import {
  acceptInvite,
  createInvite,
  decideJoinRequest,
  demoteMember,
  editClub,
  joinClub,
  kickMember,
  leaveClub,
  promoteMember,
  revokeInvite,
} from '../services/service';
import type { EditClubPayload } from '../types';
import { clubKeys } from './club-keys';
import { inboxKeys } from '@/lib/inbox/queries';

function invalidateClubsAndInbox(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: clubKeys.all });
  qc.invalidateQueries({ queryKey: inboxKeys.all });
}

export function useJoinClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clubId: number) => joinClub(clubId),
    // Membership changes `isMember` on the detail query and the join state on
    // every list query, so invalidate the whole namespace — the mutation only
    // receives a clubId, and `clubKeys.detail` is keyed by slug.
    onSuccess: (data) => {
      invalidateClubsAndInbox(qc);
      toast.success(
        data?.status === 'PENDING' ? 'Request sent — awaiting approval' : 'Joined!'
      );
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to join club'),
  });
}

export function useLeaveClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clubId: number) => leaveClub(clubId),
    onSuccess: () => {
      invalidateClubsAndInbox(qc);
      toast.success('You left the club');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to leave club'),
  });
}

export function useDecideJoinRequest(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      approve,
      reason,
    }: {
      requestId: number;
      approve: boolean;
      reason?: string;
    }) => decideJoinRequest(clubId, requestId, approve, reason),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: clubKeys.requests(clubId) });
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) });
      // Keep manage-tab badge (pendingRequestCount on club detail) in sync.
      qc.invalidateQueries({ queryKey: clubKeys.all });
      qc.invalidateQueries({ queryKey: inboxKeys.all });
      toast.success(vars.approve ? 'Request approved' : 'Request rejected');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to process request'),
  });
}

export function useEditClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clubId, data }: { clubId: number; data: EditClubPayload }) =>
      editClub(clubId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.all });
      toast.success('Club updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update club'),
  });
}

export function usePromoteMember(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => promoteMember(clubId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) });
      toast.success('Member promoted to moderator!');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to promote member'),
  });
}

export function useDemoteMember(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => demoteMember(clubId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) });
      toast.success('Moderator demoted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to demote member'),
  });
}

export function useKickMember(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => kickMember(clubId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) });
      toast.success('Member removed');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove member'),
  });
}

export function useCreateInvite(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: { inviteeUserId?: number; expiresInHours?: number }) =>
      createInvite(clubId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.invites(clubId) });
      toast.success('Invite created!');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invite'),
  });
}

export function useRevokeInvite(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: number) => revokeInvite(clubId, inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.invites(clubId) });
      toast.success('Invite revoked');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to revoke invite'),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptInvite(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.mine() });
      qc.invalidateQueries({ queryKey: clubKeys.all });
      qc.invalidateQueries({ queryKey: inboxKeys.all });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to accept invite'),
  });
}
