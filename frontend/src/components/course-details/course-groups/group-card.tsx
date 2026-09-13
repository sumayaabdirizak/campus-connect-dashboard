'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import { cn } from '@/lib/utils';
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
  const [expanded, setExpanded] = useState(false);
  const hasLeader = group.members.some((m) => m.role === 'LEADER');
  const memberCount = group.members.length;
  const previewMembers = group.members.slice(0, 2);
  const toggle = () => {
    if (renaming) return;
    setExpanded((v) => !v);
  };

  return (
    <article
      role='button'
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={`group-details-${group.id}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (renaming) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      className={cn(
        'flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-foreground outline-none transition-colors',
        'hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring',
        expanded ? 'max-h-[min(32rem,75vh)]' : null
      )}
    >
      <div
        className='shrink-0 border-b border-border/60 bg-card px-5 pt-5 pb-3'
        onClick={(e) => {
          if (renaming || !isStudent) e.stopPropagation();
        }}
      >
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
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <span className='inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground'>
            <Users className='size-3.5 text-primary' aria-hidden />
            {memberCount} member{memberCount === 1 ? '' : 's'}
          </span>
          {!hasLeader && memberCount > 0 && !isStudent ? (
            <Badge
              variant='outline'
              className='rounded-full border-amber-400 bg-amber-50 text-[10px] font-semibold text-amber-800'
            >
              No leader yet
            </Badge>
          ) : null}
        </div>
      </div>

      <div
        id={`group-details-${group.id}`}
        className='min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-3'
        onClick={(e) => {
          if (expanded) e.stopPropagation();
        }}
      >
        {memberCount === 0 ? (
          <p className='rounded-xl border border-dashed border-border bg-muted px-3 py-4 text-center text-sm font-medium text-muted-foreground'>
            {isStudent
              ? 'No students in this group yet.'
              : 'No students yet. Click Add students below.'}
          </p>
        ) : (
          (expanded ? group.members : previewMembers).map((m) => (
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
        {!expanded && memberCount > 2 ? (
          <p className='text-xs text-muted-foreground'>
            +{memberCount - 2} more member{memberCount - 2 === 1 ? '' : 's'}
          </p>
        ) : null}
        {expanded && !isStudent ? (
          <div onClick={(e) => e.stopPropagation()}>
            <AddMemberControls
              onStart={onStartAdd}
              disabled={candidates.length === 0}
              availableCount={candidates.length}
            />
          </div>
        ) : null}
      </div>

      <div className='shrink-0 border-t border-border/60 bg-card px-5 pt-3 pb-5'>
        <footer className='flex items-center justify-between gap-3'>
          <Button
            type='button'
            size='sm'
            className='rounded-full'
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            {expanded ? 'Show less' : 'Read more'}
          </Button>
          <p className='min-w-0 truncate text-right text-sm text-muted-foreground'>
            {memberCount} member{memberCount === 1 ? '' : 's'}
          </p>
        </footer>
      </div>
    </article>
  );
}
