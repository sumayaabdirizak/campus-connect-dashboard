import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assignmentFormFieldClass } from './field-styles';

interface DatetimeFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  min?: string;
}

export function DatetimeField({
  id,
  label,
  value,
  onBlur,
  onChange,
  error,
  hint,
  required,
  min
}: DatetimeFieldProps) {
  return (
    <div className='space-y-1'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type='datetime-local'
        value={value}
        min={min}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className={assignmentFormFieldClass}
        required={required}
      />
      {hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
      {error && <p className='text-xs text-destructive'>{error}</p>}
    </div>
  );
}
