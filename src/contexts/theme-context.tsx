'use client'

import React, { createContext, useContext, useCallback, useState, useLayoutEffect, useRef } from 'react'

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

// Helper functions - pure, no side effects
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem('theme') as Theme) || 'system'
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const calculateActualTheme = (theme: Theme): 'light' | 'dark' => {
  return theme === 'system' ? getSystemTheme() : theme
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Single state for theme preference - initialized once, no effects needed
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme())
  
  // System theme state - separate from theme preference
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme())
  
  // Calculate actual theme - derived state, no useState needed
  const actualTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme
  
  // Ref to track if we've set up the media query listener
  const mediaQuerySetup = useRef(false)

  // Theme setter with localStorage persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
  }, [])

  // Toggle theme logic - pure function of current state
  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      // When toggling from system, go to opposite of current system preference
      setTheme(systemTheme === 'dark' ? 'light' : 'dark')
    } else {
      // Toggle between explicit light and dark
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }, [theme, systemTheme, setTheme])

  // System theme change detection - separate effect, no circular dependencies
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || mediaQuerySetup.current) return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    // Update system theme when it changes
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handleChange)
    mediaQuerySetup.current = true
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, []) // No dependencies - setup only once

  // DOM class management - separate effect, only depends on computed actualTheme
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    
    const html = document.documentElement
    
    // Clean slate - remove both classes
    html.classList.remove('light', 'dark')
    
    // Add current theme class
    html.classList.add(actualTheme)
  }, [actualTheme]) // Only actualTheme dependency - no circular references

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