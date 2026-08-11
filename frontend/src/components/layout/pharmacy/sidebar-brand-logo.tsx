import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const LOGO_EXPANDED_SRC = '/assets/img/brand/sidebarlogo.png';
const LOGO_COLLAPSED_SRC = '/assets/img/brand/sidebar-icon.png';

type SidebarBrandLogoProps = {
  mini?: boolean;
  className?: string;
};

export function SidebarBrandLogo({ mini = false, className }: SidebarBrandLogoProps) {
  const src = mini ? LOGO_COLLAPSED_SRC : LOGO_EXPANDED_SRC;

  return (
    <Link
      href='/dashboard'
      className={cn('block w-full bg-transparent', className)}
      aria-label='Campus Connect home'
    >
      <span className={cn('relative block w-full bg-transparent', mini ? 'h-12' : 'h-14')}>
        <Image
          src={src}
          alt='Campus Connect — Jazeera University'
          fill
          unoptimized
          sizes={mini ? '70px' : '240px'}
          className={cn(
            'bg-transparent object-contain',
            mini ? 'object-center' : 'object-center'
          )}
          priority
        />
      </span>
    </Link>
  );
}
