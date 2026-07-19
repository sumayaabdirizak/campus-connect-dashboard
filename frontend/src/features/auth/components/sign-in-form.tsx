'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, type User } from '@/lib/auth-store';
import { handleApiError, showToast } from '@/lib/notifications';

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'University email is required.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.')
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
    <div className='animate-fade-up relative z-10 flex w-full max-w-[29rem] flex-col justify-center'>
      <div className='mb-10 flex items-center gap-3 lg:mb-12'>
        <span className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15'>
          <Icons.student className='size-6' />
        </span>
        <div>
          <p className='font-display text-lg leading-tight font-semibold tracking-tight'>
            Campus Connect
          </p>
          <p className='text-xs text-muted-foreground'>Jazeera University</p>
        </div>
      </div>

      <div className='mb-8 space-y-2'>
        <h1 className='font-display text-3xl font-bold tracking-tight sm:text-4xl'>
          Welcome to Campus Connect
        </h1>
        <p className='text-sm text-muted-foreground sm:text-base'>
          Sign in to continue to Jazeera University
        </p>
      </div>

      <form onSubmit={handleLogin} className='space-y-5' noValidate>
        <div className='space-y-2.5'>
          <Label htmlFor='email'>University Email</Label>
          <Input
            id='email'
            name='email'
            type='email'
            inputMode='email'
            autoComplete='username'
            placeholder='name@jazeera.edu'
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldErrors.email) {
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className='h-12 rounded-lg px-3.5'
          />
          {fieldErrors.email && (
            <p id='email-error' className='text-sm text-destructive'>
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className='space-y-2.5'>
          <Label htmlFor='password'>Password</Label>
          <div className='relative'>
            <Input
              id='password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='current-password'
              placeholder='Enter your password'
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              className='h-12 rounded-lg pr-12 pl-3.5'
            />
            <button
              type='button'
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className='absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              {showPassword ? (
                <Icons.eyeOff className='size-4' />
              ) : (
                <Icons.eye className='size-4' />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p id='password-error' className='text-sm text-destructive'>
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className='flex items-center justify-between gap-4 text-sm'>
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

        {error && (
          <p
            role='alert'
            className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive'
          >
            {error}
          </p>
        )}

        <Button
          type='submit'
          className='press-scale h-12 w-full rounded-lg text-base'
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
