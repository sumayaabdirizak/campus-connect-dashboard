'use client';

import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/ui/components/button';
import { Textarea } from '@/features/ui/components/textarea';
import { Checkbox } from '@/features/ui/components/checkbox';
import type { OfficeThreadDetail } from '@/lib/offices/types';

export function OfficeThreadComposer({
  thread,
  draft,
  setDraft,
  internal,
  setInternal,
  canSend,
  sending,
  onSend,
  onTypingActivity,
}: {
  thread: OfficeThreadDetail;
  draft: string;
  setDraft: (v: string) => void;
  internal: boolean;
  setInternal: (v: boolean) => void;
  canSend: boolean;
  sending: boolean;
  onSend: () => void;
  onTypingActivity?: () => void;
}) {
  const resolved = thread.status === 'RESOLVED';

  if (resolved && !thread.isStaff) {
    return (
      <p className='mt-3 rounded-xl border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground'>
        This conversation is resolved — start a new one from the office page if you need more
        help.
      </p>
    );
  }

  return (
    <div className='mt-3 space-y-2'>
      <div className='flex items-end gap-2'>
        <Textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onTypingActivity?.();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={internal ? 'Internal note (student will not see this)…' : 'Write a message…'}
          className={cn(
            'max-h-36 min-h-11 flex-1 resize-none py-2.5',
            internal && 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-500/10'
          )}
        />
        <Button size='icon' onClick={onSend} disabled={!canSend} aria-label='Send'>
          {sending ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
        </Button>
      </div>
      {thread.isStaff && (
        <label className='flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground'>
          <Checkbox checked={internal} onCheckedChange={(v) => setInternal(v === true)} />
          Internal note (staff only)
        </label>
      )}
    </div>
  );
}
