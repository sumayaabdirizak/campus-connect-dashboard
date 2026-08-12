import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen } from 'lucide-react';
import type { BankQuestion } from '@/lib/course-details/types';

export function PickerRow({
  q,
  checked,
  onToggle
}: {
  q: BankQuestion;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
        checked ? 'border-primary bg-primary/[0.04]' : 'hover:bg-muted/30'
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className='mt-0.5' />
      <div className='min-w-0 flex-1 space-y-1'>
        <p className='text-sm font-medium line-clamp-2'>{q.question_text}</p>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <Badge variant='outline' className='text-[10px]'>
            {q.question_type.replace('_', ' ')}
          </Badge>
          <Badge variant='outline' className='text-[10px] tabular-nums'>
            {q.points} pt
          </Badge>
          {q.difficulty && (
            <Badge variant='outline' className='text-[10px] capitalize'>
              {q.difficulty}
            </Badge>
          )}
          {q.topic && (
            <Badge variant='outline' className='text-[10px]'>
              {q.topic}
            </Badge>
          )}
          {q.module && (
            <Badge variant='outline' className='text-[10px] gap-1'>
              <BookOpen className='w-3 h-3' />
              {q.module.title}
            </Badge>
          )}
        </div>
      </div>
    </label>
  );
}
