'use client'

export interface GraduatedBannerProps {
  graduatedAt?: string | null;
}

export function GraduatedBanner({ graduatedAt }: GraduatedBannerProps) {
  return <div className="p-4">Graduated Banner</div>
}
export default GraduatedBanner
