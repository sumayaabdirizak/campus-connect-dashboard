'use client';

import { useMemo } from 'react';
import { useGroups } from '@/lib/course-details/queries/groups-queries';
import { useRoster } from '@/lib/course-details/queries/roster-queries';
import { AddMembersDialog } from './add-members-dialog';
import {
  assignedMemberIds,
  filterGroupsByName,
  groupAssignmentStats
} from './helpers';
import { GroupsContent } from './groups-content';
import { GroupsDialogs } from './groups-dialogs';
import { GroupsToolbar } from './groups-toolbar';
import { useGroupCrud } from './use-group-crud';
import { useGroupDialogs } from './use-group-dialogs';
import { useGroupMembers } from './use-group-members';
import { CourseTabPage } from '../_shared/course-tab-page';

export function CourseGroups({
  courseId,
  isStudent = false
}: {
  courseId: string;
  isStudent?: boolean;
}) {
  const { data: groups = [], isLoading, isError, refetch } = useGroups(courseId, { live: true });
  const { data: roster = [] } = useRoster(courseId, { live: true });
  const dialogs = useGroupDialogs();
  const crud = useGroupCrud(courseId);
  const members = useGroupMembers(courseId);

  const filtered = filterGroupsByName(groups, dialogs.search);
  const allAssignedIds = assignedMemberIds(groups);
  const { assignedCount, unassignedCount } = groupAssignmentStats(
    groups,
    roster.length
  );

  const addCandidates = useMemo(
    () => roster.filter((s) => !assignedMemberIds(groups).has(s.id)),
    [roster, groups]
  );

  const addingGroup = groups.find((g) => g.id === dialogs.addingTo) ?? null;

  return (
    <CourseTabPage>
      <GroupsToolbar
        isStudent={isStudent}
        isLoading={isLoading}
        groupCount={groups.length}
        assignedCount={assignedCount}
        totalStudents={roster.length}
        unassignedCount={unassignedCount}
        search={dialogs.search}
        onSearchChange={dialogs.setSearch}
        onCreate={() => dialogs.setCreateOpen(true)}
      />

      <GroupsContent
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isStudent={isStudent}
        groups={filtered}
        allAssignedIds={allAssignedIds}
        roster={roster}
        renamingId={dialogs.renamingId}
        renameValue={dialogs.renameValue}
        onRenameValueChange={dialogs.setRenameValue}
        onRenameSubmit={(groupId) =>
          crud.handleRename(groupId, dialogs.renameValue, dialogs.cancelRename)
        }
        onRenameCancel={dialogs.cancelRename}
        onStartRename={dialogs.startRename}
        onDelete={dialogs.setDeleteId}
        onStartAdd={dialogs.startAddMember}
        onCreate={() => dialogs.setCreateOpen(true)}
        onToggleLeader={members.handleToggleLeader}
        onRemoveMember={members.handleRemoveMember}
        removePending={members.removeMemberMutation.isPending}
        togglePending={members.setRoleMutation.isPending}
      />

      <GroupsDialogs
        createOpen={dialogs.createOpen}
        onCreateOpenChange={dialogs.setCreateOpen}
        onCreate={(values) =>
          crud.handleCreate(values, () => dialogs.setCreateOpen(false))
        }
        createPending={crud.createMutation.isPending}
        deleteId={dialogs.deleteId}
        onDeleteIdChange={dialogs.setDeleteId}
        onConfirmDelete={(id) => {
          dialogs.setDeleteId(null);
          crud.handleDelete(id);
        }}
        deletePending={crud.deleteMutation.isPending}
      />

      <AddMembersDialog
        open={dialogs.addingTo != null}
        onOpenChange={(open) => {
          if (!open) dialogs.cancelAddMember();
        }}
        groupName={addingGroup?.name ?? 'group'}
        candidates={addCandidates}
        confirming={members.bulkAdding}
        onConfirm={(ids) => {
          if (dialogs.addingTo == null) return;
          void members.handleAddMembers(
            dialogs.addingTo,
            ids,
            dialogs.cancelAddMember
          );
        }}
      />
    </CourseTabPage>
  );
}
