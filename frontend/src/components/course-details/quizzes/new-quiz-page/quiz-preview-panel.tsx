'use client';

import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import type { DraftQuestion } from '../quiz-builder/types';
import { downloadQuizPreview, printQuizPreview, type QuizPreviewData } from './build-quiz-preview-html';
import { quizFormOutlineBtnClass, quizFormPrimaryBtnClass } from './field-styles';
import {
  buildPaperSections,
  optionLetter,
  paperOptions,
  paperQuizTitle
} from './quiz-paper-format';

function PaperQuestions({ questions }: { questions: DraftQuestion[] }) {
  const sections = buildPaperSections(questions);

  if (questions.length === 0) {
    return (
      <p className='py-10 text-center text-sm italic text-muted-foreground'>No questions added yet</p>
    );
  }

  return (
    <div className='space-y-8 text-[13px] leading-relaxed text-foreground'>
      {sections.map((section) => (
        <section key={section.letter} className='space-y-4'>
          <h4 className='text-sm font-bold text-foreground'>
            Section {section.letter}: {section.title}
          </h4>
          <ol className={`list-none ${section.isChoice ? 'space-y-4' : 'space-y-5'}`}>
            {section.items.map(({ number, question }) => (
              <li key={number} className={section.isChoice ? 'space-y-1.5' : 'space-y-2'}>
                <p>
                  <span className='font-semibold'>{number}. </span>
                  {question.question_text || 'Untitled question'}
                </p>
                {section.isChoice ? (
                  <ul className='ml-5 list-none space-y-0.5'>
                    {paperOptions(question).map((o, oi) => (
                      <li key={oi}>
                        {optionLetter(oi)}. {o.option_text || '—'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className='ml-5 space-y-2 pt-1'>
                    <div className='border-b border-border' />
                    <div className='border-b border-border' />
                    <div className='border-b border-border' />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function QuizPreviewPanel({
  title,
  description,
  mode,
  is_draft,
  duration_minutes,
  passing_score,
  questions,
  totalPoints
}: {
  title: string;
  description: string;
  mode: 'online' | 'offline';
  is_draft: boolean;
  duration_minutes: number;
  passing_score: number;
  questions: DraftQuestion[];
  totalPoints: number;
}) {
  const user = useAuthStore((s) => s.user);

  const previewData: QuizPreviewData = {
    title,
    description,
    mode,
    is_draft,
    duration_minutes,
    passing_score,
    questions,
    totalPoints,
    createdByName: user?.full_name || user?.name || 'Instructor'
  };

  return (
    <div className='space-y-3 lg:sticky lg:top-4'>
      {mode === 'offline' ? (
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            className={`${quizFormOutlineBtnClass} h-9 px-3 text-xs`}
            onClick={() => printQuizPreview(previewData)}
          >
            <Printer className='size-3.5' /> Print
          </Button>
          <Button
            size='sm'
            className={`${quizFormPrimaryBtnClass} h-9 px-3 text-xs`}
            onClick={() => downloadQuizPreview(previewData)}
          >
            <Download className='size-3.5' /> Download
          </Button>
        </div>
      ) : null}

      <div className='overflow-hidden rounded-xl border border-border/90 bg-card'>
        <div className='flex items-center justify-between border-b border-border px-6 py-4'>
          <span className='text-[15px] font-semibold text-primary'>Campus Connect</span>
          <span className='text-base font-semibold text-foreground'>Quiz</span>
        </div>

        <div className='flex max-h-[min(72vh,760px)] flex-col overflow-y-auto px-6 pb-6 pt-5 text-foreground'>
          {/* Paper header */}
          <div className='space-y-4 border-b border-border pb-4'>
            <h3 className='text-center text-lg font-bold tracking-tight text-foreground'>
              {paperQuizTitle(title)}
            </h3>
            <div className='flex items-end justify-between gap-6 text-sm text-foreground'>
              <p className='min-w-0 flex-1'>
                Name: <span className='tracking-widest'>________________</span>
              </p>
              <p className='shrink-0'>
                ID: <span className='tracking-widest'>____________</span>
              </p>
            </div>
          </div>

          {description.trim() ? (
            <p className='mt-3 text-sm text-muted-foreground'>{description.trim()}</p>
          ) : null}

          <div className='min-h-[140px] flex-1 py-6'>
            <PaperQuestions questions={questions} />
          </div>
        </div>
      </div>
    </div>
  );
}
