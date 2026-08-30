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
  onStartAdd,
  onToggleLeader,
  onRemoveMember,
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
  onStartAdd: () => void;
  onToggleLeader: (memberId: number, role: GroupMemberRole) => void;
  onRemoveMember: (memberId: number) => void;
  removePending: boolean;
  togglePending: boolean;
}) {
  const hasLeader = group.members.some((m) => m.role === 'LEADER');

  return (
    <article className='rounded-xl border-2 border-border bg-card p-4 transition-shadow hover:shadow-md'>
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

      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <span className='rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground'>
          {group.members.length} member{group.members.length === 1 ? '' : 's'}
        </span>
        {!hasLeader && group.members.length > 0 && !isStudent ? (
          <Badge
            variant='outline'
            className='rounded-full border-amber-400 bg-amber-50 text-[10px] font-semibold text-amber-800'
          >
            No leader yet
          </Badge>
        ) : null}
      </div>

      <div className='space-y-2'>
        {group.members.length === 0 ? (
          <p className='rounded-xl border border-dashed border-border bg-muted px-3 py-4 text-center text-sm font-medium text-muted-foreground'>
            No students yet. Click Add students below.
          </p>
        ) : (
          group.members.map((m) => (
            <GroupMemberRow
              key={m.id}
              member={m}
              isStudent={isStudent}
              onToggleLeader={() => onToggleLeader(m.memberId, m.role)}
              onRemove={() => onRemoveMember(m.memberId)}
              togglePending={togglePending}
              removePending={removePending}
            />
          ))
        )}
      </div>

      {!isStudent ? (
        <AddMemberControls
          onStart={onStartAdd}
          disabled={candidates.length === 0}
          availableCount={candidates.length}
        />
      ) : null}
    </article>
  );
}
