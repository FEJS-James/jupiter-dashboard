'use client'

import dynamic from 'next/dynamic'

export const LazyCommandPalette = dynamic(
  () => import('@/components/ui/command-palette').then(mod => ({ default: mod.CommandPalette })),
  { ssr: false },
)
