'use client';

import { Icons } from '@/components/icons';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { cn } from '@/lib/utils';

type SignInPasswordFieldProps = {
  value: string;
  showPassword: boolean;
  error?: string;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

export function SignInPasswordField({
  value,
  showPassword,
  error,
  onChange,
  onToggleVisibility
}: SignInPasswordFieldProps) {
  return (
    <div className='space-y-2'>
      <Label htmlFor='password'>
        Password <span className='text-destructive'>*</span>
      </Label>
      <div
        className={cn(
          'flex h-12 items-center overflow-hidden rounded-lg border bg-background shadow-xs transition-[color,box-shadow]',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          error && 'border-destructive ring-destructive/20'
        )}
      >
        <Input
          id='password'
          name='password'
          type={showPassword ? 'text' : 'password'}
          autoComplete='current-password'
          placeholder='Enter your password'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'password-error' : undefined}
          className='h-full flex-1 rounded-none border-0 bg-transparent px-3.5 shadow-none focus-visible:ring-0'
        />
        <button
          type='button'
          onClick={onToggleVisibility}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className='inline-flex h-full shrink-0 items-center justify-center border-l px-3.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          {showPassword ? (
            <Icons.eyeOff className='size-4' />
          ) : (
            <Icons.eye className='size-4' />
          )}
        </button>
      </div>
      {error ? (
        <p id='password-error' className='text-sm text-destructive'>
          {error}
        </p>
      ) : null}
    </div>
  );
}
