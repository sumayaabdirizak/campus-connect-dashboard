'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Award, Keyboard } from 'lucide-react'
import { format } from 'date-fns'
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types'
import { GraderAnswerRow } from './grader-answer-row'
import { useAttemptGrader } from './use-attempt-grader'

interface AttemptGraderProps {
  attempt: QuizAttempt
  courseOfferingId: string
  quizId: number
  onBack: () => void
}

export function AttemptGrader({
  attempt,
  courseOfferingId,
  quizId,
  onBack,
}: AttemptGraderProps) {
  const g = useAttemptGrader(attempt, courseOfferingId, quizId, onBack)

  return (
    <div className='space-y-4'>
      <Button variant='ghost' onClick={onBack} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back to attempts
      </Button>

      <div className='border rounded-xl p-4 flex items-center justify-between gap-3 bg-muted/30'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h2 className='font-bold truncate'>{g.studentName}</h2>
            {g.isGraded ? (
              <Badge variant='secondary' className='gap-1'>
                <Award className='w-3 h-3' /> Graded
              </Badge>
            ) : g.ungradedCount > 0 ? (
              <Badge variant='destructive' className='gap-1'>
                {g.ungradedCount} ungraded
              </Badge>
            ) : null}
          </div>
          <p className='text-xs text-muted-foreground'>
            {g.earnedPoints.toFixed(1)} / {g.totalPoints.toFixed(1)} pts
            {g.submittedAt ? (
              <span> · submitted {format(new Date(g.submittedAt), 'MMM d, h:mm a')}</span>
            ) : null}
          </p>
        </div>
        <div className='shrink-0 text-right'>
          <p className='text-2xl font-bold tabular-nums'>{Math.round(g.liveScore)}%</p>
        </div>
      </div>

      {g.shortAnswerIndexes.length > 0 ? (
        <div className='text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap'>
          <Keyboard className='w-3.5 h-3.5' />
          <kbd className='px-1 rounded border bg-muted'>j</kbd>/
          <kbd className='px-1 rounded border bg-muted'>k</kbd> next/prev ·
          <kbd className='px-1 rounded border bg-muted'>c</kbd> correct ·
          <kbd className='px-1 rounded border bg-muted'>w</kbd> wrong ·
          <kbd className='px-1 rounded border bg-muted'>⌘S</kbd> save
        </div>
      ) : null}

      <div className='space-y-3'>
        {g.answers.map((ans, i) => {
          const isShort = ans.question?.question_type === 'SHORT_ANSWER'
          return (
            <GraderAnswerRow
              key={ans.id}
              ans={ans}
              index={i}
              isFocused={i === g.focusedRow && !!isShort}
              draft={g.drafts[ans.id]}
              onFocus={() => g.setFocusedRow(i)}
              onStampFull={() => g.stampFull(i)}
              onStampWrong={() => g.stampWrong(i)}
              onSetDraft={(patch) => g.setDraft(ans.id, patch)}
              setRowRef={(el) => {
                g.rowRefs.current[i] = el
              }}
            />
          )
        })}
        {g.answers.length === 0 ? (
          <div className='border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground'>
            This attempt has no answers — likely auto-submitted with everything blank.
          </div>
        ) : null}
      </div>

      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={onBack}>
          Cancel
        </Button>
        <Button
          onClick={g.handleSave}
          disabled={g.gradeMutation.isPending || Object.keys(g.drafts).length === 0}
          className='gap-1'
        >
          {g.gradeMutation.isPending
            ? 'Saving…'
            : `Save ${Object.keys(g.drafts).length} grade${Object.keys(g.drafts).length === 1 ? '' : 's'}`}
          <ArrowRight className='w-4 h-4' />
        </Button>
      </div>
    </div>
  )
}
