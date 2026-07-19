'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/auth-store';
import type { User } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { handleApiError, showToast } from '@/lib/notifications';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      showToast('warning', 'Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      const data = await apiClient<{ user: User }>('/auth/login', {
          method: 'POST',
        body: JSON.stringify({ email, password })
      });

      setUser(data.user);
      showToast('success', 'Welcome back!');
      router.push('/dashboard');
    } catch (err: unknown) {
      handleApiError(err, 'Login failed. Please check your credentials.');
      setError(
        err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='animate-fade-up flex w-full max-w-md flex-col justify-center space-y-7'>
      <div className='flex items-center justify-center gap-2 lg:hidden'>
        <span className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
          <GraduationCap className='size-4' />
        </span>
        <span className='font-display font-semibold tracking-tight'>Campus Connect</span>
      </div>

      <div className='flex flex-col space-y-2 text-center lg:text-left'>
        <h1 className='text-3xl font-bold tracking-tight'>Welcome back</h1>
        <p className='text-sm text-muted-foreground'>
          Sign in with your university account to continue
        </p>
      </div>

      <form onSubmit={handleLogin} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            name='email'
            type='email'
            autoComplete='username'
            autoFocus
            placeholder='student@jazeera.edu'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='h-11'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='password'>Password</Label>
          <div className='relative'>
            <Input
              id='password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='current-password'
              placeholder='Your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='h-11 pr-11'
            />
            <button
              type='button'
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className='absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              {showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
            </button>
          </div>
        </div>

        {error && (
          <p role='alert' className='text-destructive text-center text-sm lg:text-left'>
            {error}
          </p>
        )}

        <Button type='submit' className='press-scale h-11 w-full text-base' disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className='text-muted-foreground text-center text-sm'>
        Forgot your password? Contact your administrator.
      </p>
    </div>
  );
}
