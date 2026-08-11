'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { Textarea } from '@/features/ui/components/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { useUpdateOffice } from '@/lib/offices/queries';
import type { SupportOffice } from '@/lib/offices/types';

export function EditOfficeDialog({
  office,
  open,
  onOpenChange
}: {
  office: SupportOffice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const officeId = office?.id ?? 0;
  const update = useUpdateOffice(officeId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [codePrefix, setCodePrefix] = useState('');

  useEffect(() => {
    if (!office || !open) return;
    setName(office.name);
    setDescription(office.description ?? '');
    setCodePrefix(office.codePrefix ?? '');
  }, [office, open]);

  async function onSubmit() {
    if (!office || !name.trim()) return;
    await update.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      codePrefix: codePrefix.trim() || 'OFC'
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit office</DialogTitle>
          <DialogDescription>
            Slug stays fixed so existing links and inboxes keep working.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='edit-office-name'>Name</Label>
            <Input
              id='edit-office-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='edit-office-slug'>Slug</Label>
            <Input id='edit-office-slug' value={office?.slug ?? ''} disabled />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='edit-office-prefix'>Code prefix</Label>
            <Input
              id='edit-office-prefix'
              value={codePrefix}
              onChange={(e) => setCodePrefix(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='edit-office-desc'>Description</Label>
            <Textarea
              id='edit-office-desc'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='min-h-20'
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={update.isPending || !name.trim()}
            className='gap-1.5'
          >
            {update.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
