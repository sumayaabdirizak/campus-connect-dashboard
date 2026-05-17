'use client'

/**
 * Animated gradient banner used when a club has no uploaded banner image.
 * Uses the club's themeColor to generate a 3-stop animated gradient via
 * pure CSS keyframes — no JS animation cost.
 */

import { useMemo } from 'react'

function deriveHues(hex: string): [string, string, string] {
  // Parse hex → hsl-ish hue, then derive complementary stops
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  if (max !== min) {
    const d = max - min
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }
  const h1 = Math.round(h)
  const h2 = (h1 + 40) % 360
  const h3 = (h1 + 200) % 360
  return [
    `oklch(0.65 0.15 ${h1})`,
    `oklch(0.55 0.12 ${h2})`,
    `oklch(0.45 0.10 ${h3})`
  ]
}

export function ClubAnimatedBanner({
  themeColor,
  className = '',
  children,
}: {
  themeColor: string
  className?: string
  children?: React.ReactNode
}) {
  const [c1, c2, c3] = useMemo(() => deriveHues(themeColor), [themeColor])

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`,
        backgroundSize: '200% 200%',
        animation: 'club-gradient-shift 8s ease infinite',
      }}
    >
      <style>{`
        @keyframes club-gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      {/* Subtle noise texture overlay */}
      <div
        className='absolute inset-0 opacity-[0.04] mix-blend-overlay'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      {children}
    </div>
  )
}
