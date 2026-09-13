import { AUTH_BRAND } from '@/config/auth-brand';
import { AuthBrandLogo } from './auth-brand-logo';
import { SignInBrandCarousel } from './sign-in-brand-carousel';

const PANEL_SUBTITLE =
  'Access your courses, assignments, and campus resources in one place.';

export function SignInBrandPanel() {
  return (
    <aside className='relative hidden h-svh max-h-svh overflow-hidden border-e border-sky-100/80 bg-gradient-to-b from-sky-50 via-[#eef7ff] to-cyan-50/80 lg:block'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(125,211,252,0.35),transparent_55%)]'
      />

      <div className='relative z-10 mx-auto flex h-full w-full max-w-xl flex-col px-10 py-9 xl:px-14 xl:py-11'>
        <AuthBrandLogo variant='full' className='shrink-0 self-start' />

        <div className='flex min-h-0 flex-1 flex-col items-center justify-center py-2'>
          <SignInBrandCarousel>
            <div className='max-w-sm text-center'>
              <h1 className='font-display text-[2rem] font-bold tracking-tight text-slate-800 xl:text-[2.35rem]'>
                Welcome!
              </h1>
              <p className='mt-2.5 text-[0.9375rem] leading-relaxed text-slate-500'>
                {PANEL_SUBTITLE}
              </p>
              <p className='sr-only'>{AUTH_BRAND.organization}</p>
            </div>
          </SignInBrandCarousel>
        </div>
      </div>
    </aside>
  );
}
