'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { BookOpen } from 'lucide-react';
import type { CourseModule } from '@/lib/course-details/services/resources-types';
import { NO_MODULE, type FormState } from './form-state';

interface BasicsTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
  modules: CourseModule[];
}

export function BasicsTab({ form, setForm, modules }: BasicsTabProps) {
  return (
    <div className='space-y-3 mt-4'>
      <div className='space-y-1.5'>
        <Label htmlFor='quiz-title'>Title *</Label>
        <Input
          id='quiz-title'
          placeholder='e.g. Midterm — Chapters 1–4'
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='quiz-desc'>Description</Label>
        <Textarea
          id='quiz-desc'
          rows={3}
          placeholder='Topics covered, any tips for the student…'
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='quiz-mode'>Mode</Label>
        <Select
          value={form.mode}
          onValueChange={(v) => setForm({ ...form, mode: v as FormState['mode'] })}
        >
          <SelectTrigger id='quiz-mode'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='online'>Online — students take it in-app</SelectItem>
            <SelectItem value='offline'>Offline — printed handout</SelectItem>
          </SelectContent>
        </Select>
        <p className='text-[11px] text-muted-foreground'>
          Offline quizzes are for printing only — students don&apos;t take them in-app.
        </p>
      </div>

      {modules.length > 0 ? (
        <div className='space-y-1.5'>
          <Label className='flex items-center gap-1'>
            <BookOpen className='w-3.5 h-3.5' /> Chapter
          </Label>
          <Select
            value={form.moduleSelect}
            onValueChange={(v) => setForm({ ...form, moduleSelect: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_MODULE}>Ungrouped</SelectItem>
              {[...modules]
                .sort((a, b) => a.position - b.position)
                .map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.title}
                    {!m.publishedAt ? ' · Draft' : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className='text-[11px] text-muted-foreground'>
            Groups this quiz under the chapter on the Quizzes tab. Students see the chapter
            label on the quiz card.
          </p>
        </div>
      ) : null}

      <div className='flex items-center justify-between rounded-md border p-3'>
        <div className='space-y-0.5'>
          <p className='text-sm font-medium'>Save as draft</p>
          <p className='text-[11px] text-muted-foreground'>
            Hidden from students. Useful while you&apos;re still adding questions.
          </p>
        </div>
        <Switch
          checked={form.is_draft}
          onCheckedChange={(v) => setForm({ ...form, is_draft: v })}
        />
      </div>
    </div>
  );
}
