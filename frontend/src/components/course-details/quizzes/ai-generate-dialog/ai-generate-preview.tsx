'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GeneratedQuestion } from '@/lib/course-details/types';
import { PreviewRow } from './preview-row';

interface AiGeneratePreviewProps {
  generated: GeneratedQuestion[];
  keepSet: Set<number>;
  onToggleKeep: (idx: number) => void;
  onToggleAll: () => void;
  onBack: () => void;
  isSaving: boolean;
}

export function AiGeneratePreview({
  generated,
  keepSet,
  onToggleKeep,
  onToggleAll,
  onBack,
  isSaving
}: AiGeneratePreviewProps) {
  return (
    <div className='flex-1 flex flex-col gap-3 overflow-hidden'>
      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='sm'
          className='gap-1 -ml-2'
          onClick={onBack}
          disabled={isSaving}
        >
          <ArrowLeft className='w-4 h-4' /> Back to prompt
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='ml-auto'
          onClick={onToggleAll}
          disabled={isSaving}
        >
          {keepSet.size === generated.length ? 'Deselect all' : 'Select all'}
        </Button>
      </div>
      <div className='flex-1 overflow-y-auto pr-1 -mr-1 space-y-2'>
        {generated.map((q, idx) => (
          <PreviewRow
            key={idx}
            q={q}
            checked={keepSet.has(idx)}
            onToggle={() => onToggleKeep(idx)}
          />
        ))}
      </div>
    </div>
  );
}
