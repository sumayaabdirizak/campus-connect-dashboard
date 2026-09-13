import { AUTH_BRAND } from '@/config/auth-brand';
import { AuthBrandLogo } from './auth-brand-logo';

export function SignInFormHeader() {
  return (
    <>
      <div className='mb-6 hidden lg:mb-10 lg:block'>
        <AuthBrandLogo />
      </div>

      <div className='mb-6 space-y-1.5 lg:mb-8'>
        <h1 className='font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]'>
          {AUTH_BRAND.welcomeTitle}
        </h1>
        <p className='text-sm text-muted-foreground sm:text-base'>
          {AUTH_BRAND.welcomeSubtitle}
        </p>
      </div>
    </>
  );
}
