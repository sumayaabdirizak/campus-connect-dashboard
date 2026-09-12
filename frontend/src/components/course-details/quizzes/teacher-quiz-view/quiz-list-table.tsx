'use client';

import { useEffect, useMemo, useState } from 'react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell
} from '@/features/pos/components/pos-table';
import { showToast } from '@/lib/notifications';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { QuizListRow } from './quiz-list-row';
import {
  QUIZ_ALL_COLS,
  QUIZ_COLUMN_OPTS,
  QUIZ_SORT_OPTS,
  type QuizRowHandlers,
  exportQuizzesCsv,
  filterQuizzes,
  normalizeQuizVisibleCols,
  sortQuizzes
} from './quizzes-table-utils';

export function QuizListTable({
  quizzes,
  isLoading,
  selectedIds,
  handlers,
  courseMaxMarks
}: {
  quizzes: Quiz[];
  isLoading: boolean;
  selectedIds: Set<number>;
  handlers: QuizRowHandlers;
  courseMaxMarks?: number;
}) {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('newest');
  const [visibleCols, setVisibleCols] = useState<string[]>(() =>
    normalizeQuizVisibleCols([...QUIZ_ALL_COLS])
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const col = (id: string) =>
    visibleCols.includes(id) || (id === 'marks' && visibleCols.includes('chapter'));

  useEffect(() => {
    setVisibleCols((prev) => normalizeQuizVisibleCols(prev));
  }, []);

  const rows = useMemo(
    () => sortQuizzes(filterQuizzes(quizzes, search), sortId),
    [quizzes, search, sortId]
  );

  useEffect(() => {
    setPage(1);
  }, [search, sortId, quizzes.length]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  if (isLoading) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border border-border bg-card'>
        <div className='border-primary size-8 animate-spin rounded-full border-4 border-t-transparent' />
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search quiz name or description…'
      columns={[...QUIZ_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={(ids) => setVisibleCols(normalizeQuizVisibleCols(ids))}
      sortOptions={QUIZ_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportQuizzesCsv(rows);
        showToast('success', 'Exported quizzes.csv');
      }}
      footer={
        rows.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='quizzes'
          />
        ) : null
      }
    >
      {rows.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium text-foreground'>
            {quizzes.length === 0 ? 'No quizzes yet' : 'No matches'}
          </p>
          <p className='mt-1 text-sm text-muted-foreground'>
            {quizzes.length === 0
              ? 'Create one, add questions, then publish it for students.'
              : 'Try another search term.'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              <PosTableHeaderCell className='w-10 !text-foreground' />
              {col('title') ? (
                <PosTableHeaderCell className='!text-foreground'>Title</PosTableHeaderCell>
              ) : null}
              {col('marks') ? (
                <PosTableHeaderCell className='!text-foreground'>Marks</PosTableHeaderCell>
              ) : null}
              {col('questions') ? (
                <PosTableHeaderCell className='!text-foreground'>Questions</PosTableHeaderCell>
              ) : null}
              {col('date') ? (
                <PosTableHeaderCell className='!text-foreground'>Date</PosTableHeaderCell>
              ) : null}
              {col('attempts') ? (
                <PosTableHeaderCell align='right' className='!text-foreground'>
                  Attempts
                </PosTableHeaderCell>
              ) : null}
              <PosTableHeaderCell align='right' className='!text-foreground'>
                Action
              </PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((q) => (
              <QuizListRow
                key={q.id}
                quiz={q}
                courseMaxMarks={courseMaxMarks}
                col={col}
                isSelected={selectedIds.has(q.id)}
                onToggleSelect={() => handlers.onToggleSelect(q.id)}
                onEditQuiz={() => handlers.onEditQuiz(q)}
                onViewAttempts={() => handlers.onViewAttempts(q)}
                onDelete={() => handlers.onDelete(q)}
                onTogglePublish={() => handlers.onTogglePublish(q)}
                onDuplicate={() => handlers.onDuplicate(q)}
                onPreview={() => handlers.onPreview(q)}
              />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
