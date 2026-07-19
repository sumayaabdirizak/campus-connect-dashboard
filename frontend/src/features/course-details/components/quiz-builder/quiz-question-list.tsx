'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import type { QuizQuestion } from '../../api/quizzes-types';
import { SortableQuestionRow } from './sortable-question-row';

interface QuizQuestionListProps {
  questions: QuizQuestion[];
  canAddQuestions: boolean;
  draftOpen: boolean;
  deletePending: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: (q: QuizQuestion) => void;
  onDelete: (q: QuizQuestion) => void;
}

export function QuizQuestionList({
  questions,
  canAddQuestions,
  draftOpen,
  deletePending,
  onDragEnd,
  onEdit,
  onDelete
}: QuizQuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div className='space-y-2'>
      {questions.length === 0 && !draftOpen ? (
        <div className='border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground'>
          {canAddQuestions
            ? 'No questions yet. Click "Add question" to start.'
            : 'No questions on this published quiz.'}
        </div>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          {questions.map((q, i) => (
            <SortableQuestionRow
              key={q.id}
              question={q}
              index={i}
              disableActions={draftOpen}
              deletePending={deletePending}
              onEdit={() => onEdit(q)}
              onDelete={() => onDelete(q)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
