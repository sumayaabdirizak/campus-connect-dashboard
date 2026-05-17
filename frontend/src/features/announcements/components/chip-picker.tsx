'use client';

import * as React from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface ChipOption {
  id: string;
  name: string;
  /** Optional secondary label (e.g. "Computer Science") shown muted under name. */
  hint?: string;
}

interface ChipPickerProps {
  /** Selected option IDs. */
  value: string[];
  onChange: (ids: string[]) => void;
  options: ChipOption[];
  /** Label rendered above the trigger; tied via aria-labelledby. */
  label: string;
  /** Empty-state placeholder shown inside the trigger when nothing is selected. */
  placeholder?: string;
  /** Optional empty-options message (e.g. "Pick a department first"). */
  emptyMessage?: string;
  /** Optional max selectable (defaults to 50). */
  max?: number;
  disabled?: boolean;
  id?: string;
}

/**
 * Modern multi-select rendered as a chip-cloud trigger + searchable popover.
 * Selected items appear as removable chips inside the trigger; toggling an item
 * in the popover adds/removes from `value`.
 */
export function ChipPicker({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select…',
  emptyMessage = 'No options available',
  max = 50,
  disabled,
  id
}: ChipPickerProps) {
  const [open, setOpen] = React.useState(false);
  const triggerId = id ?? React.useId();
  const labelId = `${triggerId}-label`;

  const byId = React.useMemo(() => {
    const map = new Map<string, ChipOption>();
    options.forEach((o) => map.set(o.id, o));
    return map;
  }, [options]);

  const selected = value.map((v) => byId.get(v)).filter(Boolean) as ChipOption[];
  const atLimit = value.length >= max;

  const toggle = (optId: string) => {
    if (value.includes(optId)) {
      onChange(value.filter((v) => v !== optId));
    } else {
      if (atLimit) return;
      onChange([...value, optId]);
    }
  };

  const remove = (optId: string) => onChange(value.filter((v) => v !== optId));

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between'>
        <label
          id={labelId}
          htmlFor={triggerId}
          className='text-xs font-medium text-foreground'
        >
          {label}
        </label>
        {value.length > 0 && (
          <span className='text-[11px] tabular-nums text-muted-foreground' aria-live='polite'>
            {value.length}
            {max < 50 ? ` / ${max}` : ''} selected
          </span>
        )}
      </div>
      <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
        <PopoverTrigger asChild>
          <button
            type='button'
            id={triggerId}
            aria-labelledby={labelId}
            aria-haspopup='listbox'
            aria-expanded={open}
            disabled={disabled || options.length === 0}
            className={cn(
              'group flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-2.5 py-1.5 text-sm shadow-xs transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              'hover:border-foreground/30',
              disabled || options.length === 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            )}
          >
            {selected.length === 0 ? (
              <span className='text-muted-foreground'>
                {options.length === 0 ? emptyMessage : placeholder}
              </span>
            ) : (
              selected.map((opt) => (
                <span
                  key={opt.id}
                  className='inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
                >
                  {opt.name}
                  <span
                    role='button'
                    tabIndex={0}
                    aria-label={`Remove ${opt.name}`}
                    className='inline-flex size-4 items-center justify-center rounded-full hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(opt.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        remove(opt.id);
                      }
                    }}
                  >
                    <Icons.close className='size-3' aria-hidden />
                  </span>
                </span>
              ))
            )}
            <Icons.chevronDown
              className={cn(
                'ms-auto size-4 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180'
              )}
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          className='w-[var(--radix-popover-trigger-width)] p-0'
        >
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const isSelected = value.includes(opt.id);
                  return (
                    <CommandItem
                      key={opt.id}
                      value={`${opt.name} ${opt.hint ?? ''}`}
                      onSelect={() => toggle(opt.id)}
                      aria-selected={isSelected}
                      className='cursor-pointer'
                    >
                      <span
                        className={cn(
                          'me-2 inline-flex size-4 shrink-0 items-center justify-center rounded border border-input',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background'
                        )}
                        aria-hidden
                      >
                        {isSelected && <Icons.check className='size-3' />}
                      </span>
                      <div className='flex min-w-0 flex-col'>
                        <span className='truncate'>{opt.name}</span>
                        {opt.hint && (
                          <span className='truncate text-[11px] text-muted-foreground'>
                            {opt.hint}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
