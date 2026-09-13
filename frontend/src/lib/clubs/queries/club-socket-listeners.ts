/**
 * Live club membership updates — the backend emits club:joined,
 * club:join-rejected, club:approved, club:removed, club:promoted, and
 * club:invited (see backend/src/router/clubs/routes/*.js), but until this
 * file nothing on the frontend ever listened for any of them. A moderator
 * approving a join request, for instance, correctly wrote the membership
 * row and emitted the socket event — the applicant's own browser just
 * never heard it, and only picked up the change on their next unrelated
 * query refetch (e.g. navigating away and back).
 *
 * Bound once onto the single shared socket connection from
 * ensureSocket() — this does not open a new connection or join a new
 * room. Every authenticated socket already sits in `user:{id}`
 * (backend/src/socket/handlers/discussions.js), which is the room every
 * club event above is emitted to.
 */
import type { Socket } from 'socket.io-client';
import { invalidateQueries } from '@/lib/async-query';
import { inboxKeys } from '@/lib/inbox/queries';
import { clubKeys } from './club-keys';

let bound = false;

export function bindClubSocketListeners(s: Socket) {
  if (bound) return;
  bound = true;

  // Membership changed for the viewer in some way (joined, request
  // decided, promoted, removed, invited, or their own club application
  // approved) — clubKeys.all covers detail/list/mine/recommended in one
  // invalidation, same scope the join/leave mutations already invalidate
  // on their own actor-side success. Inbox club rows come from /inbox,
  // so that namespace must be invalidated too.
  const onMembershipChanged = () => {
    invalidateQueries({ queryKey: clubKeys.all });
    invalidateQueries({ queryKey: inboxKeys.all });
  };

  s.on('club:joined', onMembershipChanged);
  s.on('club:join-rejected', onMembershipChanged);
  s.on('club:approved', onMembershipChanged);
  s.on('club:removed', onMembershipChanged);
  s.on('club:promoted', onMembershipChanged);
  s.on('club:invited', onMembershipChanged);
}
