'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

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

// Initialize theme state properly without effects
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem('theme') as Theme) || 'system'
}

// Get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Calculate actual theme from theme preference
const calculateActualTheme = (themeValue: Theme): 'light' | 'dark' => {
  return themeValue === 'system' ? getSystemTheme() : themeValue
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize state with proper values - no useEffect needed for initial state
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme())
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => 
    calculateActualTheme(getInitialTheme())
  )

  // Update DOM classes based on actual theme
  const applyThemeToDOM = useCallback((newActualTheme: 'light' | 'dark') => {
    if (typeof window === 'undefined') return
    
    const html = document.documentElement
    
    if (newActualTheme === 'dark') {
      html.classList.add('dark')
      html.classList.remove('light')
    } else {
      html.classList.add('light')
      html.classList.remove('dark')
    }
  }, [])

  // Update actual theme and DOM together
  const updateActualTheme = useCallback((themeValue: Theme) => {
    const newActualTheme = calculateActualTheme(themeValue)
    setActualTheme(newActualTheme)
    applyThemeToDOM(newActualTheme)
  }, [applyThemeToDOM])

  // Set theme with localStorage persistence and update actual theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    updateActualTheme(newTheme)
  }, [updateActualTheme])

  // Toggle between light and dark (skips system)
  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      // When toggling from system, go to the opposite of what system currently shows
      const systemTheme = getSystemTheme()
      setTheme(systemTheme === 'dark' ? 'light' : 'dark')
    } else {
      // Toggle between explicit light and dark using actualTheme for consistency
      setTheme(actualTheme === 'dark' ? 'light' : 'dark')
    }
  }, [theme, actualTheme, setTheme])

  // Single effect for system theme changes only - no setState inside effect body
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Apply initial theme to DOM on mount
    applyThemeToDOM(actualTheme)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleSystemThemeChange = () => {
      // Only update if currently using system theme
      setThemeState(currentTheme => {
        if (currentTheme === 'system') {
          const newActualTheme = getSystemTheme()
          // Schedule DOM update after state update
          setTimeout(() => {
            setActualTheme(newActualTheme)
            applyThemeToDOM(newActualTheme)
          }, 0)
        }
        return currentTheme // Return same value to avoid unnecessary re-render
      })
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [actualTheme, applyThemeToDOM]) // Stable dependencies

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