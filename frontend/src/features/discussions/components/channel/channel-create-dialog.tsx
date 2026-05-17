'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useCreateChannel } from '../../api/queries';
import type {
  DiscussionChannel,
  DiscussionChannelCategory
} from '../../api/types';

const NAME_MAX = 64;
const TOPIC_MAX = 1024;
const UNCATEGORIZED = '__uncategorized__';

/**
 * Mirrors `slugifyChannelName` in
 * `backend/src/controllers/discussions/servers.js` so the user sees the same
 * slug the server is about to derive.
 *
 * Source of truth is still server-side; this is a preview only.
 */
function previewSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Channel-creation dialog (A4).
 *
 * Opens with an optional `defaultCategoryId` so the "+" next to a category
 * header pre-selects that category. Backend auto-deduplicates slugs, so the
 * name conflict guard here is purely a UX courtesy — we refuse to submit
 * when a channel with the same display name already exists on this server.
 *
 * Gating happens in the parent (`channel-sidebar.tsx`), which only renders
 * the trigger when the caller has `MANAGE_CHANNEL` on the server.
 */
export function ChannelCreateDialog({
  open,
  onOpenChange,
  serverId,
  categories,
  existingChannels,
  defaultCategoryId
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  serverId: number;
  categories: DiscussionChannelCategory[];
  existingChannels: DiscussionChannel[];
  defaultCategoryId: number | null;
}) {
  const router = useRouter();
  const createMut = useCreateChannel(serverId);

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [categoryValue, setCategoryValue] = useState<string>(UNCATEGORIZED);

  // Reset the form whenever the dialog reopens, and adopt whichever category
  // the trigger row chose for us.
  useEffect(() => {
    if (!open) return;
    setName('');
    setTopic('');
    setCategoryValue(
      defaultCategoryId == null ? UNCATEGORIZED : String(defaultCategoryId)
    );
  }, [open, defaultCategoryId]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => a.position - b.position || a.id - b.id
      ),
    [categories]
  );

  const trimmedName = name.trim();
  const trimmedTopic = topic.trim();
  const slug = previewSlug(trimmedName);

  // Backend allows duplicate names by appending `-2`, `-3`, … to the slug.
  // We surface the collision client-side so the dean isn't surprised when
  // their `#general` quietly becomes `#general-2`.
  const duplicateName = useMemo(() => {
    if (trimmedName.length === 0) return false;
    const lower = trimmedName.toLowerCase();
    return existingChannels.some(
      (c) => c.name.trim().toLowerCase() === lower
    );
  }, [existingChannels, trimmedName]);

  const nameValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX;
  const canSubmit =
    nameValid && !duplicateName && !createMut.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const body: { name: string; topic?: string | null; categoryId?: number } = {
      name: trimmedName
    };
    if (trimmedTopic.length > 0) body.topic = trimmedTopic;
    if (categoryValue !== UNCATEGORIZED) {
      const n = Number(categoryValue);
      if (Number.isFinite(n) && n > 0) body.categoryId = n;
    }
    createMut.mutate(body, {
      onSuccess: (data) => {
        onOpenChange(false);
        const newId = Number((data as { channel?: { id?: number } })?.channel?.id);
        if (Number.isFinite(newId) && newId > 0) {
          router.push(`/dashboard/chat/${serverId}/${newId}`);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels are where people in this server have conversations.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='new-channel-name' className='text-xs'>
              Name
            </Label>
            <div className='relative'>
              <span className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>
                #
              </span>
              <Input
                id='new-channel-name'
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                placeholder='general'
                autoFocus
                aria-invalid={duplicateName ? 'true' : undefined}
                className='pl-6'
                maxLength={NAME_MAX}
              />
            </div>
            <div className='flex items-center justify-between px-1 text-[10px]'>
              {duplicateName ? (
                <span className='text-destructive'>Name already used.</span>
              ) : slug.length > 0 ? (
                <span className='text-muted-foreground'>
                  URL slug: <span className='font-mono'>#{slug}</span>
                </span>
              ) : (
                <span className='text-muted-foreground'>Required</span>
              )}
              <span className='text-muted-foreground'>
                {trimmedName.length}/{NAME_MAX}
              </span>
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='new-channel-topic' className='text-xs'>
              Topic <span className='text-muted-foreground'>(optional)</span>
            </Label>
            <Textarea
              id='new-channel-topic'
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, TOPIC_MAX))}
              placeholder='What is this channel about?'
              rows={2}
              maxLength={TOPIC_MAX}
              className='resize-none'
            />
            <div className='flex items-center justify-end px-1 text-[10px] text-muted-foreground'>
              {topic.length}/{TOPIC_MAX}
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='new-channel-category' className='text-xs'>
              Category
            </Label>
            <Select
              value={categoryValue}
              onValueChange={setCategoryValue}
            >
              <SelectTrigger
                id='new-channel-category'
                className='w-full'
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
                {sortedCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createMut.isPending ? (
              <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
            ) : null}
            Create channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
