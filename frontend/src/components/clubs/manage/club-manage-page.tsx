'use client'

import { use } from 'react'
import { ClubManagePane } from './club-manage-pane'

export function ClubManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  return <ClubManagePane slug={slug} />
}

export default ClubManagePage
