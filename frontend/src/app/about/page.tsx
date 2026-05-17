import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About'
};

export default function AboutPage() {
  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl'>
        {/* Header */}
        <div className='mb-12 text-center'>
          <h1 className='text-foreground text-3xl font-bold tracking-tight sm:text-4xl'>
            Campus Connect
          </h1>
          <p className='text-muted-foreground mt-4 text-lg'>
            Digital Academic Communication Platform
          </p>
        </div>

        {/* Content Sections */}
        <div className='space-y-8'>
          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>Final Year Project</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              Campus Connect is a comprehensive digital communication platform designed for academic
              institutions to streamline interactions between students, lecturers, and
              administration.
            </p>
          </section>

          <section className='bg-card rounded-2xl border p-8 shadow-sm'>
            <h2 className='text-foreground mb-4 text-xl font-semibold'>Local Authentication</h2>
            <p className='text-muted-foreground text-lg leading-relaxed'>
              The platform implementation uses a secure local role-based access control system to
              ensure data privacy and role-appropriate feature access.
            </p>
          </section>
        </div>

        {/* Footer Note */}
        <div className='mt-12 text-center'>
          <p className='text-muted-foreground text-sm'>
            Built with Next.js, Tailwind CSS, and shadcn/ui
          </p>
        </div>
      </div>
    </div>
  );
}
