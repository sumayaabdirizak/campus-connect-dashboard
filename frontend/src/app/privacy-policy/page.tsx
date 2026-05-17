import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: {
    index: false
  }
};

export default function PrivacyPolicyPage() {
  return (
    <div className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        {/* Main Heading */}
        <h1 className='text-foreground text-3xl font-bold'>Privacy Policy</h1>

        {/* Introduction */}
        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Introduction</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            This Privacy Policy explains how Campus Connect handles your personal information. We
            are committed to protecting the privacy of our students and staff.
          </p>
        </section>

        {/* Local Storage Auth */}
        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Data Storage</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            This platform uses local browser storage to maintain session information for authorized
            users. No persistent identifying data is shared with external third-party authentication
            providers.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className='text-foreground mb-3 text-xl font-semibold'>Contact Us</h2>
          <p className='text-muted-foreground text-base leading-relaxed'>
            If you have any questions regarding this Privacy Policy, please contact the University
            ICT department.
          </p>
        </section>

        {/* Last Updated */}
        <div className='border-border border-t pt-4'>
          <p className='text-muted-foreground text-sm'>Last updated: April 2026</p>
        </div>
      </div>
    </div>
  );
}
