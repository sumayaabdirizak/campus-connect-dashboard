'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/features/ui/components/button';
import { Label } from '@/features/ui/components/label';
import { Textarea } from '@/features/ui/components/textarea';
import { STUDENT_CSV_TEMPLATE } from '@/lib/users/services/parse-student-csv';

type Props = {
  csvText: string;
  onCsvText: (value: string) => void;
  hint: string;
  parseErrors: string[];
};

export function BulkStudentsCsvField({ csvText, onCsvText, hint, parseErrors }: Props) {
  function downloadTemplate() {
    const blob = new Blob([STUDENT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCsvText(String(reader.result || ''));
    reader.readAsText(file);
  }

  return (
    <div className='space-y-1.5'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Label>Students CSV</Label>
        <div className='flex gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={downloadTemplate}>
            Template
          </Button>
          <label className='border-input bg-background hover:bg-accent inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-3 text-xs font-medium'>
            <Icons.upload className='size-3.5' />
            Upload
            <input
              type='file'
              accept='.csv,text/csv'
              className='sr-only'
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>
      <Textarea
        value={csvText}
        onChange={(e) => onCsvText(e.target.value)}
        placeholder={'full_name,email\nAmina Hassan,amina@…'}
        rows={6}
        className='font-mono text-xs'
      />
      <p className='text-xs text-muted-foreground'>{hint}</p>
      {parseErrors.length > 0 ? (
        <p className='text-destructive text-xs'>{parseErrors.slice(0, 3).join(' · ')}</p>
      ) : null}
    </div>
  );
}
