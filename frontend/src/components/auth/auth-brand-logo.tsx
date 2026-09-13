import Image from 'next/image';
import Link from 'next/link';
import { AUTH_BRAND } from '@/config/auth-brand';
import { cn } from '@/lib/utils';

const LOGO_FULL = '/assets/img/brand/sidebarlogo.png';
const LOGO_ICON = '/assets/img/brand/sidebar-icon.png';

type AuthBrandLogoProps = {
  href?: string;
  variant?: 'full' | 'icon' | 'onDark';
  className?: string;
};

/** Real Campus Connect logos for auth surfaces. */
export function AuthBrandLogo({
  href = '/',
  variant = 'full',
  className
}: AuthBrandLogoProps) {
  const onDark = variant === 'onDark';
  const src = variant === 'icon' ? LOGO_ICON : LOGO_FULL;

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center text-decoration-none',
        onDark && 'rounded-lg bg-white/95 px-2 py-1.5',
        className
      )}
      aria-label={`${AUTH_BRAND.productName} home`}
    >
      <span
        className={cn(
          'relative block bg-transparent',
          variant === 'icon'
            ? 'size-14'
            : 'h-12 w-[240px] sm:h-14 sm:w-[280px] xl:h-[3.75rem] xl:w-[300px]'
        )}
      >
        <Image
          src={src}
          alt={`${AUTH_BRAND.productName} — ${AUTH_BRAND.organization}`}
          fill
          unoptimized
          priority
          sizes={variant === 'icon' ? '56px' : '300px'}
          className='bg-transparent object-contain object-left'
        />
      </span>
    </Link>
  );
}
