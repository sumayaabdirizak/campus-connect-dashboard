'use client';

import { BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { CourseModule } from '../../api/resources-types';
import type { QuizQuestionType } from '../../api/quizzes-types';
import { ANY_VALUE, NO_MODULE } from './constants';
import type { FormDraft } from './form-draft';

interface BankFormMetaFieldsProps {
  draft: FormDraft;
  setDraft: React.Dispatch<React.SetStateAction<FormDraft>>;
  modules: CourseModule[];
  switchType: (next: QuizQuestionType) => void;
}

export function BankFormMetaFields({
  draft,
  setDraft,
  modules,
  switchType
}: BankFormMetaFieldsProps) {
  return (
    <>
      <div className='space-y-1.5'>
        <Label htmlFor='bank-q-text'>Question</Label>
        <Textarea
          id='bank-q-text'
          rows={3}
          value={draft.question_text}
          onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-1.5'>
          <Label>Type</Label>
          <Select
            value={draft.question_type}
            onValueChange={(v) => switchType(v as QuizQuestionType)}
          >
            <SelectTrigger className='h-9 text-sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='MCQ'>Multiple choice</SelectItem>
              <SelectItem value='TRUE_FALSE'>True / False</SelectItem>
              <SelectItem value='SHORT_ANSWER'>Short answer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='bank-q-points'>Points</Label>
          <Input
            id='bank-q-points'
            type='number'
            min={0.5}
            max={100}
            step={0.5}
            value={draft.points}
            onChange={(e) =>
              setDraft({ ...draft, points: Math.max(0.5, Number(e.target.value) || 1) })
            }
          />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='bank-q-topic'>Topic</Label>
          <Input
            id='bank-q-topic'
            placeholder='e.g. Sorting'
            value={draft.topic}
            onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
          />
        </div>
        <div className='space-y-1.5'>
          <Label>Difficulty</Label>
          <Select
            value={draft.difficulty || ANY_VALUE}
            onValueChange={(v) =>
              setDraft({
                ...draft,
                difficulty: v === ANY_VALUE ? '' : (v as 'easy' | 'medium' | 'hard')
              })
            }
          >
            <SelectTrigger className='h-9 text-sm'>
              <SelectValue placeholder='Unset' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Unset</SelectItem>
              <SelectItem value='easy'>Easy</SelectItem>
              <SelectItem value='medium'>Medium</SelectItem>
              <SelectItem value='hard'>Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {modules.length > 0 ? (
        <div className='space-y-1.5'>
          <Label className='flex items-center gap-1'>
            <BookOpen className='w-3.5 h-3.5' /> Chapter
          </Label>
          <Select
            value={draft.moduleId}
            onValueChange={(v) => setDraft({ ...draft, moduleId: v })}
          >
            <SelectTrigger className='h-9 text-sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
        </div>
      ) : null}
    </>
  );
}
