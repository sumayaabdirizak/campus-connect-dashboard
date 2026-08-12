import Link from 'next/link'
import { Icons } from '@/components/icons'
import { ClubAnimatedBanner } from '@/components/clubs/club-animated-banner'
import { messagesDiscoverHref } from '@/lib/inbox/services/messages-href'

type Props = {
  bannerUrl?: string | null
  themeColor: string
  initials: string
}

export function ClubDetailBanner({ bannerUrl, themeColor, initials }: Props) {
  return (
    <div className='relative h-40 w-full overflow-hidden'>
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
      <div
        className='absolute inset-x-0 bottom-0 h-20'
        style={{
          background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
        }}
      />
      <Link
        href={messagesDiscoverHref()}
        className='absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background'
      >
        <Icons.chevronLeft className='h-4 w-4' />
      </Link>
    </div>
  )
}
