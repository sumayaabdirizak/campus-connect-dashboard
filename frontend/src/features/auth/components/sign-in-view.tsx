import { SignInBrandPanel } from './sign-in-brand-panel';
import { SignInForm } from './sign-in-form';

export default function SignInViewPage() {
  return (
    <main className='grid min-h-svh overflow-hidden bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]'>
      <SignInBrandPanel />
      <section className='relative flex min-h-svh items-center justify-center px-5 py-10 sm:px-8 lg:px-12'>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_38%)]' />
        <SignInForm />
      </section>
    </main>
  );
}
