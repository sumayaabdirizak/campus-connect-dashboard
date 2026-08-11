'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/features/ui/components/command';
import { Label } from '@/features/ui/components/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/components/popover';
import { cn } from '@/lib/utils';

export type BatchSearchOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  label: string;
  placeholder: string;
  searchPlaceholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: BatchSearchOption[];
  disabled?: boolean;
  emptyMessage?: string;
  required?: boolean;
};

export function BatchSearchSelect({
  label,
  placeholder,
  searchPlaceholder,
  value,
  onChange,
  options,
  disabled = false,
  emptyMessage = 'No matches found.',
  required = false
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  return (
    <div className='space-y-1.5'>
      <Label>
        {label}
        {required ? <span className='text-destructive'> *</span> : null}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={disabled}
            className='w-full justify-between font-normal'
          >
            <span className='truncate'>
              {selected
                ? selected.hint
                  ? `${selected.label} (${selected.hint})`
                  : selected.label
                : placeholder}
            </span>
            <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
          <Command>
            <CommandInput placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.hint ?? ''}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className='truncate'>{option.label}</span>
                    {option.hint ? (
                      <span className='ml-auto text-xs text-muted-foreground'>{option.hint}</span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
