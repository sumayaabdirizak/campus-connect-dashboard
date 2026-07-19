'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FormState = {
  batchSectionId: string;
  academicYearId: string;
  semesterId: string;
};

export function UserFormStudentSection({
  form,
  onChange,
  sections,
  academicYears,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
  sections: Array<{ id: number; name: string; batch?: { name: string } }>;
  academicYears: Array<{ id: number; name: string }>;
}) {
  return (
    <div className='space-y-4 mt-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50'>
      <h4 className='text-sm font-semibold'>Student Enrollment</h4>

      <div className='space-y-1.5'>
        <Label>Assign Batch Section</Label>
        <Select value={form.batchSectionId} onValueChange={(val) => onChange({ batchSectionId: val })}>
          <SelectTrigger>
            <SelectValue placeholder='Select Section' />
          </SelectTrigger>
          <SelectContent>
            {sections.map((sec) => (
              <SelectItem key={sec.id} value={sec.id.toString()}>
                {sec.batch?.name} - {sec.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-1.5'>
        <Label>Academic Year</Label>
        <Select value={form.academicYearId} onValueChange={(val) => onChange({ academicYearId: val })}>
          <SelectTrigger>
            <SelectValue placeholder='Select Year' />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((ay) => (
              <SelectItem key={ay.id} value={ay.id.toString()}>
                {ay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-1.5'>
        <Label>Semester Number</Label>
        <Select value={form.semesterId} onValueChange={(val) => onChange({ semesterId: val })}>
          <SelectTrigger>
            <SelectValue placeholder='Select Semester' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='1'>First Semester</SelectItem>
            <SelectItem value='2'>Second Semester</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
