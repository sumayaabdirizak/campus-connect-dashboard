'use client';

import { useGroups } from '../../api/groups-queries';
import { useRoster } from '../../api/roster-queries';
import {
  assignedMemberIds,
  filterGroupsByName,
  groupAssignmentStats,
} from './helpers';
import { GroupsContent } from './groups-content';
import { GroupsDialogs } from './groups-dialogs';
import { GroupsToolbar } from './groups-toolbar';
import { useGroupCrud } from './use-group-crud';
import { useGroupDialogs } from './use-group-dialogs';
import { useGroupMembers } from './use-group-members';

export function CourseGroups({
  courseId,
  isStudent = false,
}: {
  courseId: string;
  isStudent?: boolean;
}) {
  const { data: groups = [], isLoading, isError, refetch } = useGroups(courseId);
  const { data: roster = [] } = useRoster(courseId);
  const dialogs = useGroupDialogs();
  const crud = useGroupCrud(courseId);
  const members = useGroupMembers(courseId);

  const filtered = filterGroupsByName(groups, dialogs.search);
  const allAssignedIds = assignedMemberIds(groups);
  const { assignedCount, unassignedCount } = groupAssignmentStats(
    groups,
    roster.length
  );

  return (
    <div className='space-y-4'>
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
        addingTo={dialogs.addingTo}
        pickMember={dialogs.pickMember}
        onPickMember={dialogs.setPickMember}
        onAddConfirm={(groupId) =>
          members.handleAddMember(groupId, dialogs.pickMember, dialogs.cancelAddMember)
        }
        onAddCancel={dialogs.cancelAddMember}
        onStartAdd={dialogs.startAddMember}
        onCreate={() => dialogs.setCreateOpen(true)}
        onToggleLeader={members.handleToggleLeader}
        onRemoveMember={members.handleRemoveMember}
        addPending={members.addMemberMutation.isPending}
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
    </div>
  );
}
