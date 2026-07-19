'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useGradeAttempt } from '../../api/quizzes-queries'
import type { GradedAnswerInput, QuizAttempt } from '../../api/quizzes-types'

export function useAttemptGrader(
  attempt: QuizAttempt,
  courseOfferingId: string,
  quizId: number,
  onBack: () => void
) {
  const gradeMutation = useGradeAttempt(courseOfferingId, quizId)

  const answers = useMemo(
    () =>
      [...(attempt.answers ?? [])].sort(
        (a, b) => (a.question?.order_index ?? 0) - (b.question?.order_index ?? 0)
      ),
    [attempt.answers]
  )

  const shortAnswerIndexes = useMemo(
    () =>
      answers
        .map((a, i) => (a.question?.question_type === 'SHORT_ANSWER' ? i : -1))
        .filter((i) => i >= 0),
    [answers]
  )

  const [drafts, setDrafts] = useState<
    Record<number, { points_earned: number; is_correct: boolean }>
  >({})
  const [focusedRow, setFocusedRow] = useState<number>(shortAnswerIndexes[0] ?? 0)
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({})

  useEffect(() => {
    const el = rowRefs.current[focusedRow]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedRow])

  const setDraft = (
    answerId: number,
    patch: Partial<{ points_earned: number; is_correct: boolean }>
  ) => {
    setDrafts((d) => {
      const prev = d[answerId] ?? { points_earned: 0, is_correct: false }
      return { ...d, [answerId]: { ...prev, ...patch } }
    })
  }

  const stampFull = (idx: number) => {
    const a = answers[idx]
    if (!a?.question) return
    setDraft(a.id, { points_earned: a.question.points, is_correct: true })
  }
  const stampWrong = (idx: number) => {
    const a = answers[idx]
    if (!a) return
    setDraft(a.id, { points_earned: 0, is_correct: false })
  }

  const handleSave = () => {
    const touched = Object.entries(drafts)
    if (touched.length === 0) {
      toast.info('No changes to save')
      return
    }
    const payload: GradedAnswerInput[] = touched.map(([id, d]) => ({
      answerId: Number(id),
      points_earned: d.points_earned,
      is_correct: d.is_correct,
    }))
    gradeMutation.mutate(
      { attemptId: attempt.id, answers: payload },
      {
        onSuccess: () => {
          toast.success(`Saved ${touched.length} grade${touched.length === 1 ? '' : 's'}`)
          onBack()
        },
        onError: (e: Error) => toast.error(e.message),
      }
    )
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        if (!(e.metaKey || e.ctrlKey)) return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
        return
      }
      if (shortAnswerIndexes.length === 0) return
      const here = shortAnswerIndexes.indexOf(focusedRow)
      const wrapNext = (n: number) =>
        shortAnswerIndexes[(n + shortAnswerIndexes.length) % shortAnswerIndexes.length]
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedRow(wrapNext(here + 1))
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedRow(wrapNext(here - 1))
      } else if (e.key.toLowerCase() === 'c') {
        stampFull(focusedRow)
      } else if (e.key.toLowerCase() === 'w') {
        stampWrong(focusedRow)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedRow, drafts, answers, shortAnswerIndexes])

  const totalPoints = answers.reduce((s, a) => s + (a.question?.points ?? 0), 0)
  const earnedPoints = answers.reduce((s, a) => {
    const override = drafts[a.id]?.points_earned
    return s + (override ?? a.points_earned ?? 0)
  }, 0)
  const liveScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
  const ungradedCount = answers.filter(
    (a) =>
      a.question?.question_type === 'SHORT_ANSWER' && a.is_correct == null && !drafts[a.id]
  ).length

  return {
    answers,
    shortAnswerIndexes,
    drafts,
    focusedRow,
    setFocusedRow,
    rowRefs,
    setDraft,
    stampFull,
    stampWrong,
    handleSave,
    gradeMutation,
    studentName: attempt.student?.full_name ?? `#${attempt.studentId}`,
    totalPoints,
    earnedPoints,
    liveScore,
    ungradedCount,
    isGraded: attempt.is_graded,
    submittedAt: attempt.submitted_at,
  }
}
