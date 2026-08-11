'use client';

import { Badge } from '@/features/ui/components/badge';
import type { CourseGroup, GroupMemberRole } from '@/lib/course-details/services/groups-types';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';
import { AddMemberControls } from './add-member-controls';
import { GroupCardHeader } from './group-card-header';
import { GroupMemberRow } from './group-member-row';

export function GroupCard({
  group,
  isStudent,
  candidates,
  renaming,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
  onStartRename,
  onDelete,
  adding,
  pickMember,
  onPickMember,
  onAddConfirm,
  onAddCancel,
  onStartAdd,
  onToggleLeader,
  onRemoveMember,
  addPending,
  removePending,
  togglePending
}: {
  group: CourseGroup;
  isStudent: boolean;
  candidates: RosterStudent[];
  renaming: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onDelete: () => void;
  adding: boolean;
  pickMember: string;
  onPickMember: (v: string) => void;
  onAddConfirm: () => void;
  onAddCancel: () => void;
  onStartAdd: () => void;
  onToggleLeader: (memberId: number, role: GroupMemberRole) => void;
  onRemoveMember: (memberId: number) => void;
  addPending: boolean;
  removePending: boolean;
  togglePending: boolean;
}) {
  const hasLeader = group.members.some((m) => m.role === 'LEADER');

  return (
    <div className='border rounded-lg p-4'>
      <GroupCardHeader
        name={group.name}
        isStudent={isStudent}
        renaming={renaming}
        renameValue={renameValue}
        onRenameValueChange={onRenameValueChange}
        onRenameSubmit={onRenameSubmit}
        onRenameCancel={onRenameCancel}
        onStartRename={onStartRename}
        onDelete={onDelete}
      />

      <div className='flex items-center gap-2 mb-3'>
        <p className='text-sm text-muted-foreground'>{group.members.length} members</p>
        {!hasLeader && group.members.length > 0 && !isStudent ? (
          <Badge variant='outline' className='text-warning border-warning text-[10px]'>
            No leader
          </Badge>
        ) : null}
      </div>

      <div className='space-y-2'>
        {group.members.map((m) => (
          <GroupMemberRow
            key={m.id}
            member={m}
            isStudent={isStudent}
            onToggleLeader={() => onToggleLeader(m.memberId, m.role)}
            onRemove={() => onRemoveMember(m.memberId)}
            togglePending={togglePending}
            removePending={removePending}
          />
        ))}
      </div>

      {!isStudent ? (
        <AddMemberControls
          isAdding={adding}
          candidates={candidates}
          pickMember={pickMember}
          onPickMember={onPickMember}
          onConfirm={onAddConfirm}
          onCancel={onAddCancel}
          onStart={onStartAdd}
          confirmPending={addPending}
        />
      ) : null}
    </div>
  );
}
