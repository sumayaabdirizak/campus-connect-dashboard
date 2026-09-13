'use client';

import { useStore } from '@tanstack/react-form';
import { Switch } from '@/features/ui/components/switch';
import { FieldDescription, FieldLabel } from '@/features/ui/components/field';
import {
  useFieldContext,
  FormFieldSet,
  FormField,
  createFormField
} from '@/features/ui/components/form-context';

interface SwitchFieldProps {
  label: string;
  description?: string;
}

export function SwitchField({ label, description }: SwitchFieldProps) {
  const field = useFieldContext();
  const value = useStore(field.store, (s) => s.value) as boolean;

  return (
    <FormFieldSet>
      <FormField orientation='horizontal'>
        <div className='flex flex-1 flex-col gap-1.5 leading-snug'>
          <FieldLabel className='text-base'>{label}</FieldLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
        </div>
        <Switch checked={value} onCheckedChange={field.handleChange} onBlur={field.handleBlur} />
      </FormField>
    </FormFieldSet>
  );
}

export const FormSwitchField = createFormField(SwitchField);
