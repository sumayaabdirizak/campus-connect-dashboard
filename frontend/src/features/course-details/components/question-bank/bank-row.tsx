'use client';

import { BookOpen, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BankQuestion } from '../../api/question-bank-types';

interface BankRowProps {
  q: BankQuestion;
  onEdit: () => void;
  onDelete: () => void;
}

export function BankRow({ q, onEdit, onDelete }: BankRowProps) {
  const correctCount = q.bankOptions.filter((o) => o.is_correct).length;
  return (
    <div className='group border rounded-lg p-3 hover:bg-muted/30 transition-colors'>
      <div className='flex items-start gap-3'>
        <div className='min-w-0 flex-1 space-y-1'>
          <p className='text-sm font-medium line-clamp-2'>{q.question_text}</p>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <Badge variant='outline' className='text-[10px]'>
              {q.question_type.replace('_', ' ')}
            </Badge>
            <Badge variant='outline' className='text-[10px] tabular-nums'>
              {q.points} pt
            </Badge>
            {q.difficulty ? (
              <Badge variant='outline' className='text-[10px] capitalize'>
                {q.difficulty}
              </Badge>
            ) : null}
            {q.topic ? (
              <Badge variant='outline' className='text-[10px]'>
                {q.topic}
              </Badge>
            ) : null}
            {q.module ? (
              <Badge variant='outline' className='text-[10px] gap-1'>
                <BookOpen className='w-3 h-3' />
                {q.module.title}
              </Badge>
            ) : null}
            {q.question_type !== 'SHORT_ANSWER' ? (
              <span className='text-[10px] text-muted-foreground tabular-nums'>
                {q.bankOptions.length} option{q.bankOptions.length === 1 ? '' : 's'}
                {correctCount > 0 ? ` · ${correctCount} correct` : ''}
              </span>
            ) : null}
          </div>
        </div>
        <div className='flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity'>
          <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onEdit}>
            <Pencil className='w-3.5 h-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={onDelete}
          >
            <Trash2 className='w-3.5 h-3.5' />
          </Button>
        </div>
      </div>
    </div>
  );
}
