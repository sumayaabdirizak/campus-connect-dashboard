'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { normalizeRoleName } from '@/types/auth';
import { useCreateRole } from '@/lib/roles/queries';

export function CreateRoleDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateRole();
  const [name, setName] = useState('');
  const preview = normalizeRoleName(name);

  function reset() {
    setName('');
  }

  async function onSubmit() {
    if (!preview) return;
    await create.mutateAsync({ name: preview });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>
            Custom platform roles (e.g. STAFF) can be assigned when creating users. Built-in roles
            stay unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-1.5'>
          <Label htmlFor='role-name'>Name</Label>
          <Input
            id='role-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. STAFF or Office Staff'
            maxLength={40}
          />
          {preview ? (
            <p className='text-muted-foreground text-xs'>
              Will be saved as <span className='font-mono'>{preview}</span>
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={create.isPending || preview.length < 2}
            className='gap-1.5'
          >
            {create.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
