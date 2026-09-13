'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/** DreamsPOS-aligned insight list enter: ~250ms fade, 40ms stagger. */
export const INSIGHT_EASE = [0.22, 1, 0.36, 1] as const

export function InsightListItem({
  index,
  children,
}: {
  index: number
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  if (reduce) return <li>{children}</li>
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: INSIGHT_EASE }}
    >
      {children}
    </motion.li>
  )
}
