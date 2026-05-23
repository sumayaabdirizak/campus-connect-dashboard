'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { CourseModule, CreateModuleData, UpdateModuleData } from '../api/resources-types';

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CourseModule | null;
  pending: boolean;
  onSubmit: (
    payload:
      | { mode: 'create'; data: CreateModuleData }
      | { mode: 'edit'; moduleId: number; data: UpdateModuleData }
  ) => void;
}

/**
 * Create-or-rename dialog for a course module ("Week 1", "Module 2", …).
 *
 * The publish toggle maps to `publishedAt`: ISO timestamp = published,
 * `null` = draft (only the teacher sees the bucket). We don't expose the
 * raw timestamp because the publish-on-a-schedule case is rare and adds
 * picker complexity for no payoff.
 */
export function ModuleFormDialog({
  open,
  onOpenChange,
  editing,
  pending,
  onSubmit
}: ModuleFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? '');
      setDescription(editing?.description ?? '');
      setPublished(editing ? !!editing.publishedAt : true);
    }
  }, [open, editing]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const publishedAt = published ? new Date().toISOString() : null;
    // Don't overwrite an existing publishedAt timestamp on edit — only flip
    // null↔now-iso when the toggle changes.
    const publishedAtForEdit = editing
      ? published
        ? (editing.publishedAt ?? publishedAt)
        : null
      : publishedAt;
    if (editing) {
      onSubmit({
        mode: 'edit',
        moduleId: editing.id,
        data: {
          title: title.trim(),
          description: description || null,
          publishedAt: publishedAtForEdit
        }
      });
    } else {
      onSubmit({
        mode: 'create',
        data: {
          title: title.trim(),
          description: description || null,
          publishedAt
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Rename module' : 'Add module'}</DialogTitle>
        </DialogHeader>
        <div className='space-y-3 py-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='module-title'>Title</Label>
            <Input
              id='module-title'
              placeholder='e.g. Week 1 — Foundations'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='module-description'>Description</Label>
            <Textarea
              id='module-description'
              placeholder='Optional — what this module covers, prerequisites, etc.'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className='flex items-center justify-between rounded-md border p-3'>
            <div>
              <p className='text-sm font-medium'>Publish to students</p>
              <p className='text-[11px] text-muted-foreground'>
                Off keeps it as a draft only you can see.
              </p>
            </div>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !title.trim()}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
