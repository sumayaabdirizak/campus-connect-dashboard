'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DiscussionMessageReactionRow = {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  createdAt?: string;
  user?: { id: number; full_name: string };
};

const PICKER_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '🙏', '✅', '📌', '🤔', '👀', '✨', '💯'];

function uniqueNamesInOrder(rows: DiscussionMessageReactionRow[]): string[] {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
  const seen = new Set<number>();
  const out: string[] = [];
  for (const r of sorted) {
    const uid = Number(r.userId);
    if (seen.has(uid)) continue;
    seen.add(uid);
    out.push(r.user?.full_name?.trim() || `Member ${uid}`);
  }
  return out;
}

/** e.g. "Alice, Bob + 3 reacted" when more than two people. */
export function formatReactionTooltip(names: string[], total: number): string {
  if (total <= 0) return '';
  if (total === 1) return `${names[0] ?? 'Someone'} reacted`;
  if (total === 2) return `${names[0] ?? ''}, ${names[1] ?? ''} reacted`;
  const a = names[0] ?? 'Member';
  const b = names[1] ?? 'Member';
  return `${a}, ${b} + ${total - 2} reacted`;
}

function buildEmojiGroups(
  reactions: DiscussionMessageReactionRow[] | undefined,
  myUserId: number | string | undefined
) {
  const map = new Map<string, DiscussionMessageReactionRow[]>();
  for (const r of reactions ?? []) {
    const list = map.get(r.emoji) ?? [];
    list.push(r);
    map.set(r.emoji, list);
  }
  const myId = myUserId != null && myUserId !== '' ? Number(myUserId) : NaN;
  return [...map.entries()].map(([emoji, rows]) => ({
    emoji,
    count: rows.length,
    mine: rows.some((x) => Number(x.userId) === myId),
    names: uniqueNamesInOrder(rows)
  }));
}

type Tone = 'hybrid' | 'legacy';

type DiscussionReactionPillRowProps = {
  messageId: number;
  reactions: DiscussionMessageReactionRow[] | undefined;
  myUserId?: number | string;
  tone: Tone;
  align?: 'start' | 'end';
  onToggle: (messageId: number, emoji: string, reactions: DiscussionMessageReactionRow[] | undefined) => void;
  /** Show “+ React” emoji picker (add-only). */
  showAddPicker?: boolean;
};

export function DiscussionReactionPillRow({
  messageId,
  reactions,
  myUserId,
  tone,
  align = 'start',
  onToggle,
  showAddPicker = true
}: DiscussionReactionPillRowProps) {
  const groups = buildEmojiGroups(reactions, myUserId);
  const isHybrid = tone === 'hybrid';

  const pillDefault = isHybrid
    ? 'border-border/80 bg-muted/35 text-muted-foreground hover:border-violet-500/45 hover:bg-violet-500/12'
    : 'border-zinc-700/90 bg-zinc-900/70 text-zinc-400 hover:border-violet-500/40 hover:bg-violet-500/12';

  const pillMine = isHybrid
    ? 'border-violet-500/55 bg-violet-500/15 text-violet-100 hover:border-violet-400/70 hover:bg-violet-500/22'
    : 'border-[#7c4dff]/65 bg-[#7c4dff]/22 text-zinc-100 hover:border-[#7c4dff]/80 hover:bg-[#7c4dff]/28';

  const countDefault = isHybrid ? 'text-muted-foreground' : 'text-zinc-500';
  const countMine = isHybrid ? 'text-violet-200' : 'text-violet-200';

  const addBtn = isHybrid
    ? 'border-border/80 bg-muted/30 text-muted-foreground hover:border-violet-500/45 hover:bg-violet-500/12'
    : 'border-zinc-700/90 bg-zinc-900/70 text-zinc-400 hover:border-violet-500/40 hover:bg-violet-500/12';

  return (
    <TooltipPrimitive.Provider delayDuration={350}>
      <div className={cn('mt-1.5 flex flex-wrap items-center gap-1', align === 'end' ? 'justify-end' : 'justify-start')}>
        {groups.map(({ emoji, count, mine, names }) => {
          const tip = formatReactionTooltip(names, count);
          return (
            <TooltipPrimitive.Root key={`${messageId}-rx-${emoji}`}>
              <TooltipPrimitive.Trigger asChild>
                <button
                  type='button'
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                    mine ? pillMine : pillDefault
                  )}
                  onClick={() => void onToggle(messageId, emoji, reactions)}
                  aria-label={mine ? `Remove ${emoji} reaction` : `Add ${emoji} reaction`}
                >
                  <span className='leading-none' aria-hidden>
                    {emoji}
                  </span>
                  {count > 1 ? (
                    <span className={cn('tabular-nums text-[10px]', mine ? countMine : countDefault)}>{count}</span>
                  ) : null}
                </button>
              </TooltipPrimitive.Trigger>
              <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                  side='top'
                  sideOffset={6}
                  className='z-50 max-w-[240px] rounded-md border border-border bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-md'
                >
                  {tip}
                  <TooltipPrimitive.Arrow className='fill-popover' />
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
          );
        })}
        {showAddPicker ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className={cn(
                  'h-7 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-wide',
                  addBtn
                )}
              >
                + React
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-64 p-2' align='start'>
              <p className='mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>Emoji</p>
              <div className='grid grid-cols-8 gap-0.5'>
                {PICKER_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type='button'
                    className='flex h-8 items-center justify-center rounded text-lg hover:bg-muted'
                    onClick={() => void onToggle(messageId, em, reactions)}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </TooltipPrimitive.Provider>
  );
}
