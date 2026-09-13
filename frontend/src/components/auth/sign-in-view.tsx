import { SignInBrandPanel } from './sign-in-brand-panel';
import { SignInForm } from './sign-in-form';
import { AuthBrandLogo } from './auth-brand-logo';

export default function SignInViewPage() {
  return (
    <main className='h-svh max-h-svh overflow-hidden bg-muted/40'>
      <div className='grid h-full lg:grid-cols-2'>
        <SignInBrandPanel />
        <section className='flex h-full min-h-0 flex-col overflow-auto bg-card'>
          <div className='shrink-0 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3 lg:hidden'>
            <AuthBrandLogo variant='full' />
          </div>
          <div className='mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:px-10'>
            <SignInForm />
          </div>
        </section>
      </div>
    </main>
  );
}
