'use client';

import { Library, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TeacherQuizToolbar({
  quizCount,
  onOpenBank,
  onOpenAi,
  onCreate,
}: {
  quizCount: number;
  onOpenBank: () => void;
  onOpenAi: () => void;
  onCreate: () => void;
}) {
  return (
    <div className='flex justify-between items-center gap-2 flex-wrap'>
      <p className='text-sm text-muted-foreground tabular-nums'>
        {quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}
      </p>
      <div className='flex gap-2'>
        <Button variant='outline' onClick={onOpenBank} className='gap-1'>
          <Library className='w-4 h-4' /> Question Bank
        </Button>
        <Button variant='outline' onClick={onOpenAi} className='gap-1'>
          <Sparkles className='w-4 h-4' /> Generate with AI
        </Button>
        <Button onClick={onCreate} className='gap-1'>
          <Plus className='w-4 h-4' /> New quiz
        </Button>
      </div>
    </div>
  );
}
