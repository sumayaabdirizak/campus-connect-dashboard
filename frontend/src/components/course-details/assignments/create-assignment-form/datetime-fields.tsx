import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DatetimeFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function DatetimeField({
  id,
  label,
  value,
  onBlur,
  onChange,
  error,
  hint,
  required
}: DatetimeFieldProps) {
  return (
    <div className='space-y-1'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type='datetime-local'
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {hint && <p className='text-[10px] text-muted-foreground'>{hint}</p>}
      {error && <p className='text-xs text-destructive'>{error}</p>}
    </div>
  );
}
