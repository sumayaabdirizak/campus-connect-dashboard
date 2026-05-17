'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

interface CourseGroupsProps {
  courseId: string;
  isStudent?: boolean;
}

const groups = [
  {
    id: 1,
    name: 'Group A',
    creatorId: 1,
    members: [
      { id: 1, memberId: 1, member: { id: 1, full_name: 'Ahmed Ali', number: '20210001' } },
      { id: 2, memberId: 2, member: { id: 2, full_name: 'Sara Smith', number: '20210005' } },
      { id: 3, memberId: 3, member: { id: 3, full_name: 'John Doe', number: '20210010' } }
    ],
    created_at: new Date()
  },
  {
    id: 2,
    name: 'Group B',
    creatorId: 1,
    members: [
      { id: 4, memberId: 4, member: { id: 4, full_name: 'Ali Khan', number: '20210015' } },
      { id: 5, memberId: 5, member: { id: 5, full_name: 'Fatima', number: '20210020' } }
    ],
    created_at: new Date()
  }
];

export function CourseGroups({ courseId, isStudent }: CourseGroupsProps) {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
    toast.success('Group created');
    setCreateOpen(false);
    setNewName('');
  };

  const handleDelete = (id: number) => {
    toast.success('Group deleted');
    setDeleteId(null);
  };

  const handleRemoveMember = (groupId: number, memberId: number) => {
    toast.success('Member removed');
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

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {filtered.map((g) => (
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
                  <div>
                    <p className='text-sm font-medium'>{m.member.full_name}</p>
                    <p className='text-xs text-muted-foreground'>{m.member.number}</p>
                  </div>
                  {!isStudent && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={() => handleRemoveMember(g.id, m.memberId)}
                    >
                      <UserMinus className='w-3 h-3' />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
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
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleteId && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-background p-6 rounded-lg max-w-sm'>
            <h3 className='font-bold text-lg mb-2'>Delete Group?</h3>
            <p className='text-sm text-muted-foreground mb-4'>
              This will remove the group and all its members.
            </p>
            <div className='flex gap-2 justify-end'>
              <Button variant='outline' onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant='destructive' onClick={() => handleDelete(deleteId)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
