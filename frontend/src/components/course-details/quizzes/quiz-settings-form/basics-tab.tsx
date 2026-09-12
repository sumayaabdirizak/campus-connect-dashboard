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
import {
  quizFormFieldClass,
  quizFormLabelClass,
  quizFormSelectClass,
  quizFormSwitchClass,
  quizFormSwitchRowClass,
  quizFormTextareaClass
} from '../new-quiz-page/field-styles';
import type { FormState } from './form-state';
import { formWithoutOnlineDisallowedTypes } from '../quiz-question-types';
import { OfflineDeliveryField } from './offline-delivery-field';

interface BasicsTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
}

export function BasicsTab({ form, setForm }: BasicsTabProps) {
  return (
    <div className='space-y-4'>
      <div className='grid items-start gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='quiz-title' className={quizFormLabelClass}>
            Quiz name
          </Label>
          <Input
            id='quiz-title'
            placeholder='e.g. Midterm — Chapters 1–4'
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={quizFormFieldClass}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='quiz-desc' className={quizFormLabelClass}>
            Description (optional)
          </Label>
          <Textarea
            id='quiz-desc'
            rows={1}
            placeholder='What should students know before they start?'
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${quizFormTextareaClass} min-h-[2.75rem] resize-none`}
          />
        </div>
      </div>

      <div className='grid items-end gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='quiz-mode' className={quizFormLabelClass}>
            How students take it
          </Label>
          <Select
            value={form.mode}
            onValueChange={(v) => {
              const next = { ...form, mode: v as FormState['mode'] };
              setForm(
                v === 'online' ? formWithoutOnlineDisallowedTypes(next) : next
              );
            }}
          >
            <SelectTrigger id='quiz-mode' className={quizFormSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='online'>On their device</SelectItem>
              <SelectItem value='offline'>Printed on paper</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className={quizFormSwitchRowClass}>
          <span>
            <span className='block text-sm font-medium'>Save as draft</span>
        
          </span>
          <Switch
            checked={form.is_draft}
            onCheckedChange={(v) => setForm({ ...form, is_draft: v })}
            className={quizFormSwitchClass}
          />
        </label>
      </div>

      <OfflineDeliveryField form={form} setForm={setForm} />
    </div>
  );
}
