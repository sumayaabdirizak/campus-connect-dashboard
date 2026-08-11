import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/components/avatar'
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url'
import { avatarGradient } from '@/lib/discussions/services/avatar-color'

export function DmMessageAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string | null
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  const src = resolvePublicAssetUrl(avatarUrl)

  return (
    <Avatar className='h-8 w-8 shrink-0 self-start shadow-sm ring-1 ring-black/5'>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback
        className='text-[10px] font-semibold text-white'
        style={{ background: avatarGradient(name) }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
