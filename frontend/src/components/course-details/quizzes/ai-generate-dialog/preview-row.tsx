'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { GeneratedQuestion } from '@/lib/course-details/types';

interface PreviewRowProps {
  q: GeneratedQuestion;
  checked: boolean;
  onToggle: () => void;
}

export function PreviewRow({ q, checked, onToggle }: PreviewRowProps) {
  const correctCount = q.options.filter((o) => o.is_correct).length;
  return (
    <label
      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
        checked ? 'border-primary bg-primary/[0.04]' : 'hover:bg-muted/30'
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className='mt-1' />
      <div className='min-w-0 flex-1 space-y-1.5'>
        <p className='text-sm font-medium'>{q.question_text}</p>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <Badge variant='outline' className='text-[10px]'>
            {q.question_type.replace('_', ' ')}
          </Badge>
          <Badge variant='outline' className='text-[10px] tabular-nums'>
            {q.points} pt
          </Badge>
          <Badge variant='outline' className='text-[10px] capitalize'>
            {q.difficulty}
          </Badge>
          {q.topic ? (
            <Badge variant='outline' className='text-[10px]'>
              {q.topic}
            </Badge>
          ) : null}
          {q.question_type !== 'SHORT_ANSWER' && correctCount !== 1 ? (
            <Badge variant='destructive' className='text-[10px] gap-1'>
              <XCircle className='w-3 h-3' />
              {correctCount === 0 ? 'no correct answer' : `${correctCount} correct`}
            </Badge>
          ) : null}
        </div>
        {q.question_type !== 'SHORT_ANSWER' && q.options.length > 0 ? (
          <ul className='space-y-0.5 text-xs pl-1'>
            {q.options.map((o, i) => (
              <li
                key={i}
                className={`flex items-start gap-1.5 ${
                  o.is_correct
                    ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {o.is_correct ? (
                  <CheckCircle2 className='w-3 h-3 mt-0.5 shrink-0' />
                ) : (
                  <span className='w-3 h-3 mt-0.5 shrink-0' aria-hidden />
                )}
                <span>{o.option_text}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {q.explanation ? (
          <p className='text-[11px] text-muted-foreground italic'>
            <span className='font-medium not-italic'>Why:</span> {q.explanation}
          </p>
        ) : null}
      </div>
    </label>
  );
}
