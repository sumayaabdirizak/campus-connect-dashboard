'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/features/ui/components/button';
import { Checkbox } from '@/features/ui/components/checkbox';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, type User } from '@/lib/auth-store';
import { handleApiError, showToast } from '@/lib/notifications';
import { SignInFormHeader } from './sign-in-form-header';
import { SignInPasswordField } from './sign-in-password-field';

const signInSchema = z.object({
  email: z.string().trim().min(1, 'University ID or username is required.'),
  // Trim so a trailing space from paste does not cause "Invalid credentials".
  password: z.string().trim().min(1, 'Password is required.')
});

interface FieldErrors {
  email?: string;
  password?: string;
}

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const data = await apiClient<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(result.data)
      });

      setUser(data.user);
      showToast('success', 'Welcome back!');
      router.push('/dashboard');
    } catch (caughtError: unknown) {
      handleApiError(caughtError, 'Login failed. Please check your credentials.');
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='animate-fade-up mx-auto flex w-full flex-col justify-center'>
      <SignInFormHeader />

      <form onSubmit={handleLogin} className='space-y-4' noValidate autoComplete='off'>
        <div className='space-y-2'>
          <Label htmlFor='email'>
            University ID or username <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='email'
            name='email'
            type='text'
            autoComplete='username'
            placeholder='Student ID or staff username'
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldErrors.email) {
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className='h-12 rounded-lg bg-background px-3.5'
            spellCheck='false'
          />
          {fieldErrors.email ? (
            <p id='email-error' className='text-sm text-destructive'>
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <SignInPasswordField
          value={password}
          showPassword={showPassword}
          error={fieldErrors.password}
          onChange={(value) => {
            setPassword(value);
            if (fieldErrors.password) {
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          onToggleVisibility={() => setShowPassword((visible) => !visible)}
          autoComplete='off'
        />

        <div className='flex items-center justify-between gap-4 pt-1 text-sm'>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='remember-me'
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor='remember-me' className='cursor-pointer font-normal'>
              Remember Me
            </Label>
          </div>
          <span
            className='font-medium text-primary'
            title='Contact your university administrator to reset your password'
          >
            Forgot Password?
          </span>
        </div>

        {error ? (
          <p
            role='alert'
            className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive'
          >
            {error}
          </p>
        ) : null}

        <Button
          type='submit'
          className='press-scale h-12 w-full rounded-lg text-base font-semibold'
          isLoading={loading}
        >
          Sign In
        </Button>
      </form>

      <p className='mt-8 text-center text-xs leading-relaxed text-muted-foreground'>
        Having trouble signing in? Contact your university administrator.
      </p>
    </div>
  );
}
