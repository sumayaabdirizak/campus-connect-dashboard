'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { BankQuestionFilters } from '../../api/question-bank-types';
import type { CourseModule } from '../../api/resources-types';
import { ANY_VALUE, NO_MODULE } from './constants';

interface BankFilterBarProps {
  filters: BankQuestionFilters;
  setFilters: (next: BankQuestionFilters) => void;
  topics: Array<{ name: string; count: number }>;
  modules: CourseModule[];
}

export function BankFilterBar({
  filters,
  setFilters,
  topics,
  modules
}: BankFilterBarProps) {
  const hasFilters = !!(
    filters.search ||
    filters.topic ||
    filters.difficulty ||
    filters.moduleId
  );

  return (
    <div className='flex flex-wrap items-center gap-2 min-w-0'>
      <div className='relative w-[220px]'>
        <Search className='w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Search question text'
          className='h-8 pl-7 text-sm'
          value={filters.search ?? ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
        />
      </div>
      <Select
        value={filters.topic ?? ANY_VALUE}
        onValueChange={(v) =>
          setFilters({ ...filters, topic: v === ANY_VALUE ? undefined : v })
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
          setFilters({
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
      {modules.length > 0 ? (
        <Select
          value={
            filters.moduleId === 'none'
              ? NO_MODULE
              : typeof filters.moduleId === 'number'
                ? String(filters.moduleId)
                : ANY_VALUE
          }
          onValueChange={(v) => {
            if (v === ANY_VALUE) setFilters({ ...filters, moduleId: undefined });
            else if (v === NO_MODULE) setFilters({ ...filters, moduleId: 'none' });
            else setFilters({ ...filters, moduleId: Number(v) });
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
      ) : null}
      {hasFilters ? (
        <Button
          variant='ghost'
          size='sm'
          className='gap-1 h-8 text-muted-foreground'
          onClick={() => setFilters({})}
        >
          <X className='w-3.5 h-3.5' /> Clear
        </Button>
      ) : null}
    </div>
  );
}
