'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Crown, Pencil, Plus, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { StudyGroupForm } from './study-group-form';
import type { StudyGroupFormValues } from '../schemas/study-group';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  groupKeys,
  useAddGroupMember,
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useRemoveGroupMember,
  useSetGroupMemberRole
} from '../api/groups-queries';
import { deleteGroup as deleteGroupCall } from '../api/groups-service';
import { useRoster } from '../api/roster-queries';
import { useDeleteWithUndo } from './_shared/use-delete-with-undo';
import { useQueryClient } from '@/lib/async-query';
import type { CourseGroup } from '../api/groups-types';

interface CourseGroupsProps {
  courseId: string;
  isStudent?: boolean;
}

export function CourseGroups({ courseId, isStudent }: CourseGroupsProps) {
  const { data: groups = [], isLoading, isError } = useGroups(courseId);
  const { data: roster = [] } = useRoster(courseId);
  const createMutation = useCreateGroup(courseId);
  const deleteMutation = useDeleteGroup(courseId);
  const addMemberMutation = useAddGroupMember(courseId);
  const removeMemberMutation = useRemoveGroupMember(courseId);
  const setRoleMutation = useSetGroupMemberRole(courseId);

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [pickMember, setPickMember] = useState<string>('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  // All students already assigned to ANY group in this course.
  // Used to filter the "add member" dropdown so a student can't be in two groups.
  const allAssignedIds = new Set(groups.flatMap((g) => g.members.map((m) => m.memberId)));

  const handleCreate = (values: StudyGroupFormValues) => {
    createMutation.mutate(
      { name: values.name },
      {
        onSuccess: () => {
          toast.success('Group created');
          setCreateOpen(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const handleDelete = (id: number) => {
    setDeleteId(null);
    const key = groupKeys.list(courseId);
    const snapshot = queryClient.getQueryData<CourseGroup[]>(key);
    if (!snapshot) return;
    const removed = snapshot.find((g) => g.id === id);
    if (!removed) return;
    runDelete({
      label: `Group deleted · "${removed.name}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<CourseGroup[]>(key, (prev) =>
          (prev ?? []).filter((g) => g.id !== id)
        );
      },
      restore: () => queryClient.setQueryData<CourseGroup[]>(key, () => snapshot),
      commit: () => deleteGroupCall(String(id))
    });
  };

  const handleAddMember = (groupId: number) => {
    if (!pickMember) return;
    addMemberMutation.mutate(
      { groupId: String(groupId), memberId: Number(pickMember) },
      {
        onSuccess: () => {
          toast.success('Member added');
          setAddingTo(null);
          setPickMember('');
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const handleRemoveMember = (groupId: number, memberId: number) => {
    removeMemberMutation.mutate(
      { groupId: String(groupId), memberId: String(memberId) },
      {
        onSuccess: () => toast.success('Member removed'),
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const handleToggleLeader = (groupId: number, memberId: number, currentRole: string) => {
    const newRole = currentRole === 'LEADER' ? 'MEMBER' : 'LEADER';
    setRoleMutation.mutate(
      { groupId: String(groupId), memberId: String(memberId), role: newRole },
      {
        onSuccess: () =>
          toast.success(
            newRole === 'LEADER' ? 'Set as group leader' : 'Demoted to member'
          ),
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  // Count stats for the header
  const totalStudents = roster.length;
  const assignedCount = allAssignedIds.size;
  const unassignedCount = totalStudents - assignedCount;

  return (
    <div className='space-y-4'>
      {/* Stats bar */}
      {!isStudent && !isLoading && (
        <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
          <span>{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{assignedCount} / {totalStudents} students assigned</span>
          {unassignedCount > 0 && (
            <Badge variant='outline' className='text-warning border-warning text-[10px]'>
              {unassignedCount} unassigned
            </Badge>
          )}
        </div>
      )}

      <div className='flex gap-2'>
        <Input
          placeholder='Search groups...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='max-w-xs'
        />
        {!isStudent && (
          <Button onClick={() => setCreateOpen(true)} className='gap-1'>
            <Plus className='w-4 h-4' /> Create Group
          </Button>
        )}
      </div>

      {isLoading && <ListSkeleton variant='card' count={2} />}
      {isError && <p className='text-sm text-destructive'>Failed to load groups.</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title='No groups yet'
          description={
            isStudent
              ? "Your teacher hasn't organised this course into groups yet."
              : 'Create groups for group assignments, discussions, or peer review.'
          }
          actionLabel={isStudent ? undefined : 'Create group'}
          onAction={isStudent ? undefined : () => setCreateOpen(true)}
        />
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {filtered.map((g) => {
          const hasLeader = g.members.some((m) => m.role === 'LEADER');
          const candidates = roster.filter((s) => !allAssignedIds.has(s.id));
          return (
            <div key={g.id} className='border rounded-lg p-4'>
              <div className='flex items-center justify-between mb-3'>
                {renamingId === g.id ? (
                  <form
                    className='flex gap-1 flex-1 mr-2'
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!renameValue.trim()) return;
                      // Inline rename — optimistic update would be nice but
                      // the mutation already invalidates the query.
                      import('../api/groups-service').then(({ renameGroup }) =>
                        renameGroup(String(g.id), renameValue.trim())
                          .then(() => {
                            toast.success('Group renamed');
                            setRenamingId(null);
                            queryClient.invalidateQueries({ queryKey: groupKeys.list(courseId) });
                          })
                          .catch((err: Error) => toast.error(err.message))
                      );
                    }}
                  >
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className='h-7 text-sm'
                      autoFocus
                    />
                    <Button type='submit' size='sm' className='h-7'>
                      Save
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      className='h-7'
                      onClick={() => setRenamingId(null)}
                    >
                      ✕
                    </Button>
                  </form>
                ) : (
                  <div className='flex items-center gap-1.5'>
                    <h3 className='font-medium'>{g.name}</h3>
                    {!isStudent && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={() => {
                          setRenamingId(g.id);
                          setRenameValue(g.name);
                        }}
                      >
                        <Pencil className='w-3 h-3' />
                      </Button>
                    )}
                  </div>
                )}
                {!isStudent && renamingId !== g.id && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-destructive'
                    onClick={() => setDeleteId(g.id)}
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                )}
              </div>
              <div className='flex items-center gap-2 mb-3'>
                <p className='text-sm text-muted-foreground'>{g.members.length} members</p>
                {!hasLeader && g.members.length > 0 && !isStudent && (
                  <Badge variant='outline' className='text-warning border-warning text-[10px]'>
                    No leader
                  </Badge>
                )}
              </div>
              <div className='space-y-2'>
                {g.members.map((m) => (
                  <div
                    key={m.id}
                    className='flex items-center justify-between p-2 bg-muted/30 rounded'
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      {m.role === 'LEADER' && (
                        <Crown className='w-3.5 h-3.5 text-amber-500 shrink-0' />
                      )}
                      <div className='min-w-0'>
                        <p className='text-sm font-medium truncate'>
                          {m.member.full_name}
                          {m.role === 'LEADER' && (
                            <span className='text-[10px] text-amber-600 ml-1'>Leader</span>
                          )}
                        </p>
                        <p className='text-xs text-muted-foreground'>{m.member.number}</p>
                      </div>
                    </div>
                    {!isStudent && (
                      <div className='flex items-center gap-0.5'>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className={`h-6 w-6 ${m.role === 'LEADER' ? 'text-amber-500' : ''}`}
                              onClick={() => handleToggleLeader(g.id, m.memberId, m.role)}
                              disabled={setRoleMutation.isPending}
                            >
                              <Crown className='w-3 h-3' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {m.role === 'LEADER' ? 'Remove leader role' : 'Set as leader'}
                          </TooltipContent>
                        </Tooltip>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6'
                          onClick={() => handleRemoveMember(g.id, m.memberId)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserMinus className='w-3 h-3' />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!isStudent && (
                <div className='mt-3'>
                  {addingTo === g.id ? (
                    <div className='flex gap-1'>
                      <Select value={pickMember} onValueChange={setPickMember}>
                        <SelectTrigger className='h-8 text-xs'>
                          <SelectValue placeholder='Pick student' />
                        </SelectTrigger>
                        <SelectContent>
                          {candidates.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size='sm'
                        onClick={() => handleAddMember(g.id)}
                        disabled={!pickMember || addMemberMutation.isPending}
                      >
                        Add
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => {
                          setAddingTo(null);
                          setPickMember('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant='outline'
                      size='sm'
                      className='gap-1 w-full'
                      onClick={() => {
                        setAddingTo(g.id);
                        setPickMember('');
                      }}
                      disabled={candidates.length === 0}
                    >
                      <UserPlus className='w-3.5 h-3.5' /> Add member
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <StudyGroupForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Delete Group?</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            This will remove the group and all its members. Existing submissions will
            keep their grades but lose the group association.
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
