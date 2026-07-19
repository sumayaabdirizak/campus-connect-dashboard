import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaxMarksFieldProps {
  value: number;
  onBlur: () => void;
  onChange: (value: number) => void;
  error?: string;
}

export function MaxMarksField({ value, onBlur, onChange, error }: MaxMarksFieldProps) {
  return (
    <div className='space-y-1'>
      <Label htmlFor='maxMarks'>Total marks</Label>
      <Input
        id='maxMarks'
        type='number'
        min={1}
        max={100}
        value={value}
        onBlur={onBlur}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(0);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          onChange(Math.min(100, Math.max(1, Math.trunc(parsed))));
        }}
        placeholder='100'
      />
      {error && <p className='text-xs text-destructive'>{error}</p>}
    </div>
  );
}
