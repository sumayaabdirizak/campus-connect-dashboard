'use client';

import { useStore } from '@tanstack/react-form';
import { SearchSelect } from '@/features/ui/components/search-select';
import { FieldDescription, FieldLabel } from '@/features/ui/components/field';
import {
  useFieldContext,
  FormFieldSet,
  FormField,
  FormFieldError,
  createFormField
} from '@/features/ui/components/form-context';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string };

interface SelectFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  options: Option[];
  placeholder?: string;
  triggerClassName?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export function SelectField({
  label,
  description,
  required,
  options,
  placeholder = 'Select an option',
  triggerClassName,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled
}: SelectFieldProps) {
  const field = useFieldContext();
  const isTouched = useStore(field.store, (s) => s.meta.isTouched);
  const isValid = useStore(field.store, (s) => s.meta.isValid);
  const value = useStore(field.store, (s) => s.value) as string;
  const invalid = isTouched && !isValid;

  return (
    <FormFieldSet>
      <FormField>
        <FieldLabel htmlFor={field.name}>
          {label}
          {required && ' *'}
        </FieldLabel>
        <SearchSelect
          options={options}
          value={value ?? ''}
          onValueChange={(next) => {
            field.handleChange(next);
            field.handleBlur();
          }}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
          disabled={disabled}
          className={cn(triggerClassName, invalid && 'border-destructive')}
        />
        {description && <FieldDescription>{description}</FieldDescription>}
      </FormField>
      <FormFieldError />
    </FormFieldSet>
  );
}

export const FormSelectField = createFormField(SelectField);
