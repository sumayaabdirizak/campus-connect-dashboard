'use client';

import type { BankQuestion, BankQuestionFilters } from '@/lib/course-details/types';
import { BankRow } from './bank-row';

interface BankQuestionListProps {
  questions: BankQuestion[];
  filters: BankQuestionFilters;
  isLoading: boolean;
  onEdit: (q: BankQuestion) => void;
  onDelete: (q: BankQuestion) => void;
}

export function BankQuestionList({
  questions,
  filters,
  isLoading,
  onEdit,
  onDelete
}: BankQuestionListProps) {
  if (isLoading) {
    return (
      <div className='text-sm text-muted-foreground py-8 text-center'>Loading…</div>
    );
  }
  if (questions.length === 0) {
    return (
      <div className='border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground'>
        {Object.keys(filters).length === 0
          ? 'Your bank is empty. Click "New question" to add one, or "Import CSV" to bulk-load.'
          : 'No questions match the current filters.'}
      </div>
    );
  }
  return (
    <>
      {questions.map((q) => (
        <BankRow
          key={q.id}
          q={q}
          onEdit={() => onEdit(q)}
          onDelete={() => onDelete(q)}
        />
      ))}
    </>
  );
}
