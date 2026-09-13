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
import { useFacultiesWithoutDean } from '@/lib/faculties/faculties-without-dean';

type Props = {
  value: string;
  onChange: (facultyId: string) => void;
};

export function DeanFacultySearchSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: faculties = [], isLoading } = useFacultiesWithoutDean(search);

  const selected = useMemo(
    () => faculties.find((faculty) => String(faculty.id) === value),
    [faculties, value]
  );

  return (
    <div className='space-y-1.5'>
      <Label>Faculty (no dean yet)</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='w-full justify-between font-normal'
          >
            {selected ? `${selected.name} (${selected.code})` : 'Search faculties...'}
            <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder='Search faculty name or code...'
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Loading faculties...' : 'No faculties without a dean.'}
              </CommandEmpty>
              <CommandGroup>
                {faculties.map((faculty) => (
                  <CommandItem
                    key={faculty.id}
                    value={`${faculty.name} ${faculty.code}`}
                    onSelect={() => {
                      onChange(String(faculty.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        value === String(faculty.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className='truncate'>{faculty.name}</span>
                    <span className='ml-auto text-xs text-muted-foreground'>{faculty.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className='text-xs text-muted-foreground'>
        Only faculties that do not already have a dean are listed.
      </p>
    </div>
  );
}
