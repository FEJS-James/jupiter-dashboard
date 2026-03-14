'use client'

import { useState, useEffect } from 'react'

/**
 * Returns `true` after the component has mounted on the client.
 * 
 * Use this to guard browser-dependent rendering and prevent
 * React hydration mismatches (Error #418).
 * 
 * Example:
 *   const mounted = useMounted()
 *   const isMobile = useMediaQuery('(max-width: 768px)')
 *   if (mounted && isMobile) { ... }
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
