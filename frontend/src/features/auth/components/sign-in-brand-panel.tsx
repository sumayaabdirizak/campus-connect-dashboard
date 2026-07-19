import { Icons, type Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { InteractiveGridPattern } from './interactive-grid';

const highlights: Array<{ label: string; icon: Icon }> = [
  { label: 'Courses', icon: Icons.forms },
  { label: 'Community', icon: Icons.chat },
  { label: 'Support', icon: Icons.help }
];

export function SignInBrandPanel() {
  return (
    <aside className='relative hidden min-h-svh flex-col overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14'>
      <div className='pointer-events-none absolute -top-28 -right-24 size-[28rem] rounded-full bg-white/15 blur-3xl' />
      <div className='pointer-events-none absolute -bottom-36 -left-20 size-[30rem] rounded-full bg-black/15 blur-3xl' />
      <InteractiveGridPattern
        className={cn(
          'mask-[radial-gradient(620px_circle_at_center,white,transparent)]',
          'inset-0 h-full skew-y-6 opacity-25'
        )}
      />

      <div className='relative z-20 flex items-center gap-3'>
        <span className='flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm'>
          <Icons.student className='size-6' />
        </span>
        <div>
          <p className='font-display text-lg leading-tight font-semibold tracking-tight'>
            Campus Connect
          </p>
          <p className='text-xs text-white/65'>Jazeera University</p>
        </div>
      </div>

      <div className='relative z-20 my-auto max-w-2xl pt-12'>
        <p className='animate-fade-up mb-4 text-xs font-semibold tracking-[0.25em] text-white/60'>
          JAZEERA UNIVERSITY
        </p>
        <h1
          className='animate-fade-up font-display text-5xl leading-[1.05] font-bold tracking-tight xl:text-6xl'
          style={{ animationDelay: '80ms' }}
        >
          Everything campus,
          <br />
          <span className='text-white/70'>all in one place.</span>
        </h1>
        <p
          className='animate-fade-up mt-6 max-w-lg text-base leading-relaxed text-white/70'
          style={{ animationDelay: '160ms' }}
        >
          Stay connected to your courses, assignments, grades, classmates, and university services
          from one secure workspace.
        </p>

        <div
          className='animate-fade-up mt-10 grid max-w-lg grid-cols-3 gap-3'
          style={{ animationDelay: '240ms' }}
        >
          {highlights.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className='rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm'
            >
              <Icon className='mb-3 size-5 text-white/80' />
              <p className='text-xs font-medium'>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <p className='relative z-20 text-xs text-white/45'>
        © {new Date().getFullYear()} Jazeera University · Campus Connect
      </p>
    </aside>
  );
}
