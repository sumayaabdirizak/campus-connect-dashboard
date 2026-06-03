'use client';

import { buttonVariants, Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { InteractiveGridPattern } from './interactive-grid';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';

export default function SignInViewPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      const data = await apiClient<{ user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      setUser(data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      {/* TOP RIGHT BUTTON */}
      <Link
        href='/'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Home
      </Link>

      {/* LEFT SIDE */}
      <div className='relative hidden h-full flex-col p-10 lg:flex dark:border-r'>
        {/* IMAGE BACKGROUND */}
        <img
          src='/signin.jpg'
          alt='Campus Connect'
          className='absolute inset-0 h-full w-full object-cover'
        />
        {/* OVERLAY */}
        <div className='absolute inset-0 bg-black/60' />
        {/* LOGO */}
        <div className='relative z-20 flex items-center text-lg font-medium text-white'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            className='mr-2 h-6 w-6'
          >
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          Campus Connect
        </div>
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(400px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[0%] h-full skew-y-12'
          )}
        />
        <div className='relative z-20 mt-auto text-white'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              “Centralize your academic communication, assignments, and collaboration in one place.”
            </p>
            <footer className='text-sm opacity-70'>Campus Connect Platform</footer>
          </blockquote>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col justify-center space-y-6'>
          {/* TITLE */}
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight'>Sign in</h1>
            <p className='text-sm text-muted-foreground'>
              Enter your email and password to access your dashboard
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                name='email'
                type='email'
                autoComplete='username'
                autoFocus
                placeholder='student@campus.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                name='password'
                type='password'
                autoComplete='current-password'
                placeholder='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role='alert' className='text-destructive text-center text-sm'>
                {error}
              </p>
            )}

            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <p className='text-muted-foreground text-center text-sm'>
            Forgot your password? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
