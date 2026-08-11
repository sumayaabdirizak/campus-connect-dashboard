import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

/** Auth routes always use the Pharmacy-inspired campus-connect theme. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme='campus-connect' className='min-h-svh bg-background text-foreground'>
      {children}
    </div>
  );
}
