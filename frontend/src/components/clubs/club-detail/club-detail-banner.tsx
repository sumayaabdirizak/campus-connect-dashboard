import Link from 'next/link'
import { Icons } from '@/components/icons'
import { ClubAnimatedBanner } from '@/components/clubs/club-animated-banner'
import { messagesDiscoverHref } from '@/lib/inbox/services/messages-href'

type Props = {
  bannerUrl?: string | null
  themeColor: string
  initials: string
  clubName: string
}

/**
 * Banner is always h-40 — height NEVER changes.
 * Outer wrapper allows the club avatar to overlap halfway onto the banner.
 */
export function ClubDetailBanner({ bannerUrl, themeColor, initials, clubName }: Props) {
  return (
    <div className='relative h-40 w-full flex-shrink-0'>
      <div className='absolute inset-0 overflow-hidden'>
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt='' className='h-full w-full object-cover' />
        ) : (
          <ClubAnimatedBanner themeColor={themeColor} className='h-full w-full'>
            <div className='flex h-full items-center justify-center'>
              <span className='text-6xl font-bold text-white/8'>{initials}</span>
            </div>
          </ClubAnimatedBanner>
        )}
      </div>
      {/* Back + breadcrumb — only visible when NOT collapsed (banner is visible) */}
      <div className='absolute left-4 top-4 flex items-center gap-2 z-10'>
        <Link
          href={messagesDiscoverHref()}
          className='flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted'
        >
          <Icons.chevronLeft className='h-4 w-4 text-muted-foreground' />
        </Link>
        <div className='flex items-center gap-1 px-3 py-1 rounded-full border border-border bg-card text-xs font-semibold'>
          <Link
            href={messagesDiscoverHref()}
            className='text-muted-foreground hover:text-muted-foreground transition-colors'
          >
            Clubs
          </Link>
          <span className='text-gray-300'>/</span>
          <span className='text-foreground'>{clubName}</span>
        </div>
      </div>
    </div>
  )
}
