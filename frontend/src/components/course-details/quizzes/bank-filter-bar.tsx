import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import type { BankQuestionFilters } from '@/lib/course-details/types';
import type { CourseModule } from '@/lib/course-details/services/resources-types';

export const ANY_VALUE = '__any__';
export const NO_MODULE = '__none__';

export function BankFilterBar({
  filters,
  topics,
  modules,
  hasFilters,
  allVisibleSelected,
  questionCount,
  onFiltersChange,
  onClearFilters,
  onToggleAllVisible,
}: {
  filters: BankQuestionFilters;
  topics: { name: string; count: number }[];
  modules: CourseModule[];
  hasFilters: boolean;
  allVisibleSelected: boolean;
  questionCount: number;
  onFiltersChange: (next: BankQuestionFilters) => void;
  onClearFilters: () => void;
  onToggleAllVisible: () => void;
}) {
  return (
    <div className='flex flex-wrap items-center gap-2 border-b pb-3'>
      <div className='relative w-[220px]'>
        <Search className='w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Search'
          className='h-8 pl-7 text-sm'
          value={filters.search ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
        />
      </div>
      <Select
        value={filters.topic ?? ANY_VALUE}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, topic: v === ANY_VALUE ? undefined : v })
        }
      >
        <SelectTrigger className='h-8 w-[160px] text-sm'>
          <SelectValue placeholder='Any topic' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_VALUE}>Any topic</SelectItem>
          {topics.map((t) => (
            <SelectItem key={t.name} value={t.name}>
              {t.name} ({t.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.difficulty ?? ANY_VALUE}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            difficulty: v === ANY_VALUE ? undefined : (v as 'easy' | 'medium' | 'hard')
          })
        }
      >
        <SelectTrigger className='h-8 w-[130px] text-sm'>
          <SelectValue placeholder='Any difficulty' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_VALUE}>Any difficulty</SelectItem>
          <SelectItem value='easy'>Easy</SelectItem>
          <SelectItem value='medium'>Medium</SelectItem>
          <SelectItem value='hard'>Hard</SelectItem>
        </SelectContent>
      </Select>
      {modules.length > 0 && (
        <Select
          value={
            filters.moduleId === 'none'
              ? NO_MODULE
              : typeof filters.moduleId === 'number'
                ? String(filters.moduleId)
                : ANY_VALUE
          }
          onValueChange={(v) => {
            if (v === ANY_VALUE) onFiltersChange({ ...filters, moduleId: undefined });
            else if (v === NO_MODULE) onFiltersChange({ ...filters, moduleId: 'none' });
            else onFiltersChange({ ...filters, moduleId: Number(v) });
          }}
        >
          <SelectTrigger className='h-8 w-[160px] text-sm'>
            <SelectValue placeholder='Any chapter' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>Any chapter</SelectItem>
            <SelectItem value={NO_MODULE}>Ungrouped</SelectItem>
            {[...modules]
              .sort((a, b) => a.position - b.position)
              .map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}
      {hasFilters && (
        <Button
          variant='ghost'
          size='sm'
          className='gap-1 h-8 text-muted-foreground'
          onClick={onClearFilters}
        >
          <X className='w-3.5 h-3.5' /> Clear
        </Button>
      )}
      {questionCount > 0 && (
        <Button
          variant='ghost'
          size='sm'
          className='h-8 ml-auto'
          onClick={onToggleAllVisible}
        >
          {allVisibleSelected ? 'Deselect all' : 'Select all'}
        </Button>
      )}
    </div>
  );
}
