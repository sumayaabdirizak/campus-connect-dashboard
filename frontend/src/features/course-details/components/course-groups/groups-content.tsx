'use client';

import { Users } from 'lucide-react';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { QueryErrorState } from '@/components/query-error-state';
import type { CourseGroup, GroupMemberRole } from '../../api/groups-types';
import type { RosterStudent } from '../../api/roster-types';
import { GroupCard } from './group-card';

export function GroupsContent({
  isLoading,
  isError,
  onRetry,
  isStudent,
  groups,
  allAssignedIds,
  roster,
  renamingId,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
  onStartRename,
  onDelete,
  addingTo,
  pickMember,
  onPickMember,
  onAddConfirm,
  onAddCancel,
  onStartAdd,
  onCreate,
  onToggleLeader,
  onRemoveMember,
  addPending,
  removePending,
  togglePending,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isStudent: boolean;
  groups: CourseGroup[];
  allAssignedIds: Set<number>;
  roster: RosterStudent[];
  renamingId: number | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameSubmit: (groupId: number) => void;
  onRenameCancel: () => void;
  onStartRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  addingTo: number | null;
  pickMember: string;
  onPickMember: (v: string) => void;
  onAddConfirm: (groupId: number) => void;
  onAddCancel: () => void;
  onStartAdd: (groupId: number) => void;
  onCreate: () => void;
  onToggleLeader: (
    groupId: number,
    memberId: number,
    role: GroupMemberRole
  ) => void;
  onRemoveMember: (groupId: number, memberId: number) => void;
  addPending: boolean;
  removePending: boolean;
  togglePending: boolean;
}) {
  if (isLoading) return <ListSkeleton variant='card' count={2} />;

  if (isError) {
    return <QueryErrorState title='Could not load groups' onRetry={onRetry} />;
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title='No groups yet'
        description={
          isStudent
            ? "Your teacher hasn't organised this course into groups yet."
            : 'Create groups for group assignments, discussions, or peer review.'
        }
        actionLabel={isStudent ? undefined : 'Create group'}
        onAction={isStudent ? undefined : onCreate}
      />
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
      {groups.map((g) => {
        const candidates = roster.filter((s) => !allAssignedIds.has(s.id));
        return (
          <GroupCard
            key={g.id}
            group={g}
            isStudent={isStudent}
            candidates={candidates}
            renaming={renamingId === g.id}
            renameValue={renameValue}
            onRenameValueChange={onRenameValueChange}
            onRenameSubmit={() => onRenameSubmit(g.id)}
            onRenameCancel={onRenameCancel}
            onStartRename={() => onStartRename(g.id, g.name)}
            onDelete={() => onDelete(g.id)}
            adding={addingTo === g.id}
            pickMember={pickMember}
            onPickMember={onPickMember}
            onAddConfirm={() => onAddConfirm(g.id)}
            onAddCancel={onAddCancel}
            onStartAdd={() => onStartAdd(g.id)}
            onToggleLeader={(memberId, role) =>
              onToggleLeader(g.id, memberId, role)
            }
            onRemoveMember={(memberId) => onRemoveMember(g.id, memberId)}
            addPending={addPending}
            removePending={removePending}
            togglePending={togglePending}
          />
        );
      })}
    </div>
  );
}
