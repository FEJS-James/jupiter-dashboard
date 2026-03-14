'use client'

import React, { createContext, useContext, useCallback, useState, useEffect, useLayoutEffect, useRef } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

/**
 * SSR-safe ThemeProvider.
 * 
 * To prevent hydration mismatches, we initialize with deterministic defaults
 * (theme='system', systemTheme='light') that match server output. The real
 * values from localStorage and matchMedia are applied after mount via useEffect.
 * 
 * The brief flash of wrong theme is handled by the inline script in layout.tsx
 * (or can be suppressed with CSS transitions).
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize with SSR-safe defaults — 'system' and 'light'
  // These MUST match what the server renders to avoid hydration mismatch.
  const [theme, setThemeState] = useState<Theme>('system')
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')
  
  // Derived actual theme
  const actualTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme
  
  const mediaQuerySetup = useRef(false)

  // After mount: hydrate from localStorage and matchMedia
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored)
    }
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setSystemTheme(prefersDark ? 'dark' : 'light')
  }, [])

  // Theme setter with localStorage persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }, [])

  // Toggle theme logic
  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      setTheme(systemTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }, [theme, systemTheme, setTheme])

  // System theme change detection
  useEffect(() => {
    if (mediaQuerySetup.current) return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handleChange)
    mediaQuerySetup.current = true
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // DOM class management — useLayoutEffect to avoid flash
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    html.classList.add(actualTheme)
  }, [actualTheme])

  return (
    <ThemeContext.Provider value={{
      theme,
      actualTheme,
      setTheme,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  )
}