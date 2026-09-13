'use client'

import { useMemo } from 'react'
import { useMyClubs } from '@/lib/clubs/queries'
import type { Club } from '@/lib/clubs/types'

/** Flat, de-duplicated list of clubs the current user owns, moderates, or is a member of. */
export function useJoinedClubsList(): Club[] {
  const { data } = useMyClubs()

  return useMemo(() => {
    const seen = new Set<number>()
    const out: Club[] = []
    for (const c of [
      ...(data?.owned ?? []),
      ...(data?.moderating ?? []),
      ...(data?.memberOf ?? []),
    ]) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
    return out
  }, [data])
}

export default useJoinedClubsList
