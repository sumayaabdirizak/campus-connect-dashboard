'use client'

export interface ClubDetailPaneProps {
  slug: string;
  showMobileStrip: boolean;
}

export function ClubDetailPane({ slug, showMobileStrip }: ClubDetailPaneProps) {
  return <div className="p-4">Club Detail Pane</div>
}
export default ClubDetailPane
