'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentAttempt } from '../student-quiz-attempt';
import type { Quiz } from '../../api/quizzes-types';
import { buildPreviewData } from './build-preview-data';

export function TeacherQuizPreview({
  quiz,
  onClose,
}: {
  quiz: Quiz;
  onClose: () => void;
}) {
  return (
    <div className='space-y-3'>
      <Button variant='ghost' onClick={onClose} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back
      </Button>
      <StudentAttempt
        data={buildPreviewData(quiz)}
        previewMode
        onClosePreview={onClose}
        onSubmitted={onClose}
      />
    </div>
  );
}
