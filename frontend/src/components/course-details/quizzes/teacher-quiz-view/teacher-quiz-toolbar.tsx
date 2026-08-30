'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseTabHeader } from '../../_shared/course-tab-header';

export function TeacherQuizToolbar({
  quizCount,
  onCreate,
}: {
  quizCount: number;
  onCreate: () => void;
}) {
  return (
    <CourseTabHeader
      title='Quizzes'
      description={
        quizCount === 0
          ? 'Create and manage course quizzes.'
          : `${quizCount} ${quizCount === 1 ? 'quiz' : 'quizzes'} · create, publish, and grade attempts.`
      }
      actions={
        <Button onClick={onCreate} size='sm' className='gap-1.5 rounded-full'>
          <Plus className='size-4' /> Create quiz
        </Button>
      }
    />
  );
}
