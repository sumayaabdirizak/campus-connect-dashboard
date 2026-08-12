'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types'

type Answer = NonNullable<QuizAttempt['answers']>[number]

type Props = {
  ans: Answer
  index: number
  isFocused: boolean
  draft?: { points_earned: number; is_correct: boolean }
  onFocus: () => void
  onStampFull: () => void
  onStampWrong: () => void
  onSetDraft: (patch: Partial<{ points_earned: number; is_correct: boolean }>) => void
  setRowRef: (el: HTMLDivElement | null) => void
}

export function GraderAnswerRow({
  ans,
  index,
  isFocused,
  draft,
  onFocus,
  onStampFull,
  onStampWrong,
  onSetDraft,
  setRowRef,
}: Props) {
  const q = ans.question
  if (!q) return null

  const isShort = q.question_type === 'SHORT_ANSWER'
  const effectivePoints = draft?.points_earned ?? ans.points_earned ?? 0
  const effectiveCorrect = draft?.is_correct ?? ans.is_correct

  return (
    <div
      ref={setRowRef}
      onClick={() => isShort && onFocus()}
      className={`border rounded-lg p-4 space-y-3 ${
        isFocused ? 'ring-2 ring-primary/40 border-primary/40' : ''
      }`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex items-start gap-2 min-w-0 flex-1'>
          {effectiveCorrect === true ? (
            <CheckCircle2 className='w-4 h-4 text-emerald-600 mt-0.5 shrink-0' />
          ) : effectiveCorrect === false ? (
            <XCircle className='w-4 h-4 text-destructive mt-0.5 shrink-0' />
          ) : (
            <span className='inline-block w-4 h-4 rounded-full border border-muted-foreground/40 mt-0.5 shrink-0' />
          )}
          <div className='min-w-0'>
            <p className='font-medium'>
              {index + 1}. {q.question_text}
            </p>
            <div className='flex gap-2 mt-1'>
              <Badge variant='outline' className='text-[10px]'>
                {q.question_type.replace('_', ' ')}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                max {q.points} pt
              </Badge>
            </div>
          </div>
        </div>
        <Badge variant='outline' className='shrink-0 tabular-nums'>
          {effectivePoints.toFixed(1)} / {q.points} pt
        </Badge>
      </div>

      {isShort ? (
        <div className='space-y-2 pl-6'>
          <div className='select-text border rounded p-2 text-sm bg-muted/30 whitespace-pre-wrap min-h-[2.5rem]'>
            {ans.text_answer?.trim() || (
              <span className='italic text-muted-foreground'>— no answer —</span>
            )}
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <Button
              type='button'
              variant={effectiveCorrect === true ? 'default' : 'outline'}
              size='sm'
              className='gap-1'
              onClick={onStampFull}
            >
              <CheckCircle2 className='w-3.5 h-3.5' />
              Correct ({q.points})
            </Button>
            <Button
              type='button'
              variant={
                effectiveCorrect === false && effectivePoints === 0 ? 'default' : 'outline'
              }
              size='sm'
              className='gap-1'
              onClick={onStampWrong}
            >
              <XCircle className='w-3.5 h-3.5' />
              Wrong (0)
            </Button>
            <div className='flex items-center gap-1.5 ml-auto'>
              <span className='text-[11px] text-muted-foreground'>Custom:</span>
              <Input
                type='number'
                min={0}
                max={q.points}
                step={0.5}
                value={effectivePoints}
                onChange={(e) => {
                  const v = Math.min(q.points, Math.max(0, Number(e.target.value) || 0))
                  onSetDraft({
                    points_earned: v,
                    is_correct: v >= q.points,
                  })
                }}
                className='h-7 w-20 text-sm tabular-nums'
              />
              <span className='text-[11px] text-muted-foreground'>/ {q.points}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className='pl-6 text-[11px] text-muted-foreground'>
          {effectiveCorrect === true
            ? 'Auto-graded as correct.'
            : effectiveCorrect === false
              ? 'Auto-graded as incorrect.'
              : 'Not auto-graded.'}
        </div>
      )}
    </div>
  )
}
