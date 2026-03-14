'use client'

import { useState, useEffect } from 'react'

/**
 * SSR-safe media query hook.
 * 
 * Returns `false` during SSR and the first client render to prevent
 * hydration mismatches. The actual media query value is applied after
 * the component mounts via useEffect.
 * 
 * Consumers should treat the initial `false` as "not yet determined"
 * and avoid conditional rendering that differs from the server output
 * until after mount.
 */
export function useMediaQuery(query: string): boolean {
  // Always start with false — matches server render output
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    
    // Set the real value now that we're mounted on the client
    setMatches(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}