'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  variant?: 'button' | 'dropdown'
  size?: 'sm' | 'md' | 'lg'
}

export function ThemeToggle({ 
  className, 
  variant = 'button',
  size = 'md' 
}: ThemeToggleProps) {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const icons = {
    light: Sun,
    dark: Moon,
    system: Monitor
  }

  const labels = {
    light: 'Light',
    dark: 'Dark',
    system: 'System'
  }

  const sizeClasses = {
    sm: 'h-8 w-8 p-1.5',
    md: 'h-9 w-9 p-2',
    lg: 'h-10 w-10 p-2.5'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  if (variant === 'button') {
    const CurrentIcon = icons[actualTheme]
    
    return (
      <motion.button
        onClick={toggleTheme}
        className={cn(
          'relative rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
          sizeClasses[size],
          actualTheme === 'dark'
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white focus:ring-slate-500'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 focus:ring-slate-300',
          className
        )}
        whileTap={{ scale: 0.95 }}
        title={`Switch to ${actualTheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={actualTheme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <CurrentIcon className={iconSizes[size]} />
          </motion.div>
        </AnimatePresence>
      </motion.button>
    )
  }

  // Dropdown variant
  return (
    <div className={cn('relative', className)}>
      <motion.button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
          actualTheme === 'dark'
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900',
        )}
        whileTap={{ scale: 0.98 }}
      >
        {React.createElement(icons[theme], { className: iconSizes[size] })}
        <span className="text-sm font-medium">{labels[theme]}</span>
        <ChevronDown 
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            dropdownOpen && 'rotate-180'
          )} 
        />
      </motion.button>

      <AnimatePresence>
        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(false)}
              data-testid="dropdown-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'absolute right-0 top-full mt-2 w-32 rounded-lg border shadow-lg z-20',
                actualTheme === 'dark'
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-white border-slate-200'
              )}
            >
              {(['light', 'dark', 'system'] as const).map((themeOption) => {
                const Icon = icons[themeOption]
                const isSelected = theme === themeOption
                
                return (
                  <motion.button
                    key={themeOption}
                    onClick={() => {
                      setTheme(themeOption)
                      setDropdownOpen(false)
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                      'first:rounded-t-lg last:rounded-b-lg',
                      isSelected
                        ? actualTheme === 'dark'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-900'
                        : actualTheme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    )}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{labels[themeOption]}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500"
                      />
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Simple hook for theme-aware styles
export function useThemeStyles() {
  const { actualTheme } = useTheme()
  
  const styles = {
    // Background styles
    bg: {
      primary: actualTheme === 'dark' ? 'bg-slate-950' : 'bg-white',
      secondary: actualTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-50',
      tertiary: actualTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100',
      card: actualTheme === 'dark' ? 'bg-slate-900' : 'bg-white',
      hover: actualTheme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50',
    },
    // Text styles
    text: {
      primary: actualTheme === 'dark' ? 'text-white' : 'text-slate-900',
      secondary: actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600',
      muted: actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-500',
    },
    // Border styles
    border: {
      primary: actualTheme === 'dark' ? 'border-slate-700' : 'border-slate-200',
      secondary: actualTheme === 'dark' ? 'border-slate-600' : 'border-slate-300',
    }
  }
  
  return styles
}