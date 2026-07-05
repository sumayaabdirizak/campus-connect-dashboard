'use client';

import {
  CheckSquare,
  ClipboardList,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Settings,
  Square,
  Trash2,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import type { Quiz } from '../api/quizzes-types';

export function TeacherQuizCard({
  quiz: q,
  onSettings,
  onEditQuestions,
  onViewAttempts,
  onDelete,
  onTogglePublish,
  onDuplicate,
  onPreview,
  selected,
  onToggleSelect,
  anySelected
}: {
  quiz: Quiz;
  onSettings: () => void;
  onEditQuestions: () => void;
  onViewAttempts: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  anySelected: boolean;
}) {
  const now = Date.now();
  const openMs = q.open_at ? new Date(q.open_at).getTime() : null;
  const closeMs = q.close_at ? new Date(q.close_at).getTime() : null;
  const windowState: 'scheduled' | 'open' | 'closed' | null =
    openMs && now < openMs
      ? 'scheduled'
      : closeMs && now > closeMs
        ? 'closed'
        : openMs || closeMs
          ? 'open'
          : null;
  const questionCount = q.questions?.length ?? 0;
  const attemptsCount = q._count?.attempts ?? 0;
  const isEmpty = questionCount === 0;

  return (
    <div
      className={`group border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-muted/30 focus-within:ring-2 focus-within:ring-primary/40 ${
        isEmpty && !q.is_draft ? 'border-warning' : ''
      } ${selected ? 'ring-2 ring-primary/50 bg-primary/[0.02]' : ''}`}
    >
      <button
        type='button'
        onClick={onToggleSelect}
        aria-label={selected ? `Deselect ${q.title}` : `Select ${q.title}`}
        aria-pressed={selected}
        className={`shrink-0 self-start sm:self-center p-1 -m-1 rounded transition-opacity ${
          selected || anySelected
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 focus:opacity-100'
        }`}
      >
        {selected ? (
          <CheckSquare className='w-4 h-4 text-primary' />
        ) : (
          <Square className='w-4 h-4 text-muted-foreground' />
        )}
      </button>

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2 flex-wrap'>
          <ClipboardList className='w-4 h-4 text-muted-foreground shrink-0' />
          <p className='font-medium truncate select-none'>{q.title}</p>
          {q.is_draft ? (
            <Badge variant='secondary' className='text-[10px]'>
              Draft
            </Badge>
          ) : (
            windowState && (
              <Badge
                variant={windowState === 'closed' ? 'destructive' : 'outline'}
                className={`text-[10px] capitalize ${
                  windowState === 'open'
                    ? 'text-success border-success'
                    : ''
                }`}
              >
                {windowState}
              </Badge>
            )
          )}
          {isEmpty && (
            <Badge variant='warning' size='xs'>
              No questions
            </Badge>
          )}
        </div>
        <p className='text-xs text-muted-foreground mt-1 tabular-nums'>
          {q.duration_minutes} min · pass ≥ {q.passing_score}%
          {q.max_attempts > 1 && (
            <>
              {' · '}
              {q.max_attempts} attempts
            </>
          )}
          {' · '}
          {questionCount} question
          {questionCount === 1 ? '' : 's'}
          {attemptsCount > 0 && (
            <>
              {' · '}
              <span className='inline-flex items-center gap-0.5'>
                <Users className='w-3 h-3' />
                {attemptsCount} submitted
              </span>
            </>
          )}
        </p>
      </div>

      <div className='flex items-center gap-2 shrink-0 self-stretch sm:self-auto'>
        <label
          className='flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none whitespace-nowrap'
          title={
            q.is_draft
              ? 'Currently a draft — students cannot see this quiz'
              : 'Currently published — visible to students'
          }
        >
          <Switch
            checked={!q.is_draft}
            onCheckedChange={onTogglePublish}
            aria-label={
              q.is_draft
                ? `Publish ${q.title}`
                : `Unpublish ${q.title}`
            }
          />
          <span className='hidden sm:inline'>
            {q.is_draft ? 'Draft' : 'Published'}
          </span>
        </label>

        <Button
          size='sm'
          onClick={onEditQuestions}
          aria-label={`Edit questions on ${q.title}`}
          className='gap-1'
        >
          <Pencil className='w-3.5 h-3.5' /> Questions
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={onViewAttempts}
          aria-label={
            (q.pendingGradingCount ?? 0) > 0
              ? `View attempts on ${q.title} — ${q.pendingGradingCount} need grading`
              : `View attempts on ${q.title}`
          }
          className='relative'
        >
          Attempts
          {attemptsCount > 0 && (
            <span className='ml-1 text-[10px] text-muted-foreground tabular-nums'>
              {attemptsCount}
            </span>
          )}
          {(q.pendingGradingCount ?? 0) > 0 && (
            <span
              className='ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums bg-destructive text-destructive-foreground'
              title={`${q.pendingGradingCount} attempt${q.pendingGradingCount === 1 ? '' : 's'} need grading`}
            >
              {q.pendingGradingCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              aria-label={`More actions for ${q.title}`}
            >
              <MoreHorizontal className='w-4 h-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Manage quiz
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onPreview}
              disabled={isEmpty}
              className='gap-2'
            >
              <Eye className='w-4 h-4' /> Preview as student
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSettings} className='gap-2'>
              <Settings className='w-4 h-4' /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} className='gap-2'>
              <Copy className='w-4 h-4' /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className='gap-2 text-destructive focus:text-destructive'
            >
              <Trash2 className='w-4 h-4' /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
