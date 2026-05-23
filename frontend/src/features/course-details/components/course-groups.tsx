'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
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
  groupKeys,
  useAddGroupMember,
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useRemoveGroupMember
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

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [pickMember, setPickMember] = useState<string>('');

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(
      { name: newName.trim() },
      {
        onSuccess: () => {
          toast.success('Group created');
          setCreateOpen(false);
          setNewName('');
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

  return (
    <div className='space-y-4'>
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
              ? 'Your teacher hasn’t organised this course into groups yet.'
              : 'Create groups for group assignments, discussions, or peer review.'
          }
          actionLabel={isStudent ? undefined : 'Create group'}
          onAction={isStudent ? undefined : () => setCreateOpen(true)}
        />
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {filtered.map((g) => {
          const memberIds = new Set(g.members.map((m) => m.memberId));
          const candidates = roster.filter((s) => !memberIds.has(s.id));
          return (
            <div key={g.id} className='border rounded-lg p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='font-medium'>{g.name}</h3>
                {!isStudent && (
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
              <p className='text-sm text-muted-foreground mb-3'>{g.members.length} members</p>
              <div className='space-y-2'>
                {g.members.map((m) => (
                  <div
                    key={m.id}
                    className='flex items-center justify-between p-2 bg-muted/30 rounded'
                  >
                    <div className='min-w-0'>
                      <p className='text-sm font-medium truncate'>{m.member.full_name}</p>
                      <p className='text-xs text-muted-foreground'>{m.member.number}</p>
                    </div>
                    {!isStudent && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={() => handleRemoveMember(g.id, m.memberId)}
                        disabled={removeMemberMutation.isPending}
                      >
                        <UserMinus className='w-3 h-3' />
                      </Button>
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
          <div className='space-y-4 py-4'>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder='Group name'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !newName.trim()}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Delete Group?</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            This will remove the group and all its members.
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
