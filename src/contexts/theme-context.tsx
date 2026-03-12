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

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // Get system theme preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Update actual theme based on theme setting and system preference
  const updateActualTheme = useCallback((themeValue: Theme) => {
    const newActualTheme = themeValue === 'system' ? getSystemTheme() : themeValue
    setActualTheme(newActualTheme)
    
    // Update HTML class and CSS variables
    const html = document.documentElement
    
    if (newActualTheme === 'dark') {
      html.classList.add('dark')
      html.classList.remove('light')
    } else {
      html.classList.add('light')
      html.classList.remove('dark')
    }
  }, [])

  // Set theme with localStorage persistence
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

  // Initialize theme on mount
  useEffect(() => {
    // Get saved theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as Theme
    const initialTheme = savedTheme || 'system'
    
    setThemeState(initialTheme)
    updateActualTheme(initialTheme)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      // Use the current theme state by checking it directly
      setThemeState(currentTheme => {
        if (currentTheme === 'system') {
          updateActualTheme('system')
        }
        return currentTheme
      })
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [updateActualTheme])

  // Update actual theme when theme state changes
  useEffect(() => {
    updateActualTheme(theme)
  }, [theme, updateActualTheme])

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