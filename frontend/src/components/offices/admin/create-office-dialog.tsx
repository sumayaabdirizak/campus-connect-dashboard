'use client';

import { useState } from 'react';
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
import { useCreateOffice } from '@/lib/offices/queries';
import { slugifyOfficeName } from '@/lib/offices/services';

export function CreateOfficeDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateOffice();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [codePrefix, setCodePrefix] = useState('');

  function reset() {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setDescription('');
    setCodePrefix('');
  }

  async function onSubmit() {
    if (!name.trim() || !slug.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim() || undefined,
      codePrefix: codePrefix.trim() || undefined
    });
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
          <DialogTitle>Create office</DialogTitle>
          <DialogDescription>
            Students and staff can message this office from Chats after you assign agents.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='office-name'>Name</Label>
            <Input
              id='office-name'
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (!slugTouched) setSlug(slugifyOfficeName(v));
              }}
              placeholder='e.g. Registrar'
              maxLength={80}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='office-slug'>Slug</Label>
            <Input
              id='office-slug'
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugifyOfficeName(e.target.value));
              }}
              placeholder='registrar'
              maxLength={48}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='office-prefix'>Code prefix (optional)</Label>
            <Input
              id='office-prefix'
              value={codePrefix}
              onChange={(e) => setCodePrefix(e.target.value.toUpperCase().slice(0, 6))}
              placeholder='REG'
              maxLength={6}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='office-desc'>Description (optional)</Label>
            <Textarea
              id='office-desc'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What this office handles…'
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
            disabled={create.isPending || !name.trim() || !slug.trim()}
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
