'use client'

import { ReactNode } from 'react'

/**
 * Static Data Provider
 * 
 * Previously intercepted fetch calls to serve from /data.json in static export mode.
 * Now that we have real API routes (Vercel serverless), this is a passthrough.
 * Kept for backward compatibility — can be removed once fully migrated.
 */
export function StaticDataProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
