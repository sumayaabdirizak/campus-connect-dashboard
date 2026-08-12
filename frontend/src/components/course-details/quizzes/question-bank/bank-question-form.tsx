'use client';

import { Button } from '@/components/ui/button';
import type { BankQuestion, CreateBankQuestionInput } from '@/lib/course-details/types';
import type { CourseModule } from '@/lib/course-details/services/resources-types';
import { BankFormMetaFields } from './bank-form-meta-fields';
import { BankFormOptions } from './bank-form-options';
import { useBankQuestionForm } from './use-bank-question-form';

interface BankQuestionFormProps {
  initial: BankQuestion | null;
  modules: CourseModule[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateBankQuestionInput) => void;
}

export function BankQuestionForm({
  initial,
  modules,
  pending,
  onCancel,
  onSubmit
}: BankQuestionFormProps) {
  const form = useBankQuestionForm(initial, onSubmit);

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='font-semibold'>{initial ? 'Edit question' : 'New question'}</h3>
        <Button variant='ghost' size='sm' onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <BankFormMetaFields
        draft={form.draft}
        setDraft={form.setDraft}
        modules={modules}
        switchType={form.switchType}
      />
      {!form.isShortAnswer ? (
        <BankFormOptions
          draft={form.draft}
          updateOption={form.updateOption}
          addOption={form.addOption}
          removeOption={form.removeOption}
          markSingleCorrect={form.markSingleCorrect}
        />
      ) : null}
      <div className='flex justify-end gap-2 pt-2'>
        <Button variant='outline' onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={form.handleSubmit} disabled={pending}>
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Add to bank'}
        </Button>
      </div>
    </div>
  );
}
