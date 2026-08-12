import {
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Settings,
  Trash2
} from 'lucide-react';
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
import type { Quiz } from '@/lib/course-details/services/quizzes-types';

export function TeacherQuizCardActions({
  quiz: q,
  isEmpty,
  onSettings,
  onEditQuestions,
  onViewAttempts,
  onDelete,
  onTogglePublish,
  onDuplicate,
  onPreview
}: {
  quiz: Quiz;
  isEmpty: boolean;
  onSettings: () => void;
  onEditQuestions: () => void;
  onViewAttempts: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
}) {
  const attemptsCount = q._count?.attempts ?? 0;

  return (
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
          aria-label={q.is_draft ? `Publish ${q.title}` : `Unpublish ${q.title}`}
        />
        <span className='hidden sm:inline'>{q.is_draft ? 'Draft' : 'Published'}</span>
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
          <Button variant='ghost' size='icon' aria-label={`More actions for ${q.title}`}>
            <MoreHorizontal className='w-4 h-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuLabel className='text-xs text-muted-foreground'>
            Manage quiz
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={onPreview} disabled={isEmpty} className='gap-2'>
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
  );
}
