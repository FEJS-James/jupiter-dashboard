'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { KeyboardShortcut, useKeyboardShortcuts, useGlobalNavigation } from '@/hooks/use-keyboard-shortcuts'
import { useRouter, usePathname } from 'next/navigation'

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[]
  addShortcuts: (shortcuts: KeyboardShortcut[]) => void
  removeShortcuts: (keys: string[]) => void
  showHelp: boolean
  setShowHelp: (show: boolean) => void
  selectedTaskIndex: number
  setSelectedTaskIndex: (index: number) => void
  selectedColumnIndex: number
  setSelectedColumnIndex: (index: number) => void
  isNavigationMode: boolean
  setIsNavigationMode: (mode: boolean) => void
  currentContext: string
  setCurrentContext: (context: string) => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined)

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext)
  if (context === undefined) {
    throw new Error('useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider')
  }
  return context
}

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])
  const [showHelp, setShowHelp] = useState(false)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(-1)
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0)
  const [isNavigationMode, setIsNavigationMode] = useState(false)
  const [currentContext, setCurrentContext] = useState<string>('')

  // Global navigation shortcuts
  const globalShortcuts = useGlobalNavigation()

  // Help modal shortcuts
  const helpShortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      handler: () => setShowHelp(!showHelp),
      description: 'Show keyboard shortcuts help',
      category: 'Help'
    },
    {
      key: '/',
      modifiers: { ctrl: true },
      handler: () => setShowHelp(!showHelp),
      description: 'Show keyboard shortcuts help',
      category: 'Help'
    },
    {
      key: 'escape',
      handler: () => {
        if (showHelp) {
          setShowHelp(false)
        } else {
          // Clear selections and exit navigation mode
          setSelectedTaskIndex(-1)
          setIsNavigationMode(false)
          // Clear search/filters if on tasks page
          if (pathname === '/tasks') {
            const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
            if (searchInput) {
              searchInput.value = ''
              searchInput.dispatchEvent(new Event('input', { bubbles: true }))
            }
          }
        }
      },
      description: 'Close modal or clear selection',
      category: 'General'
    }
  ]

  // Combine all shortcuts
  const allShortcuts = [...globalShortcuts, ...helpShortcuts, ...shortcuts]

  const addShortcuts = useCallback((newShortcuts: KeyboardShortcut[]) => {
    setShortcuts(prev => [...prev, ...newShortcuts])
  }, [])

  const removeShortcuts = useCallback((keys: string[]) => {
    setShortcuts(prev => prev.filter(shortcut => !keys.includes(shortcut.key)))
  }, [])

  // Update current context based on pathname
  useEffect(() => {
    const currentPage = pathname.split('/')[1] || 'dashboard'
    setCurrentContext(currentPage)
  }, [pathname])

  // Register global shortcuts
  useKeyboardShortcuts({
    shortcuts: allShortcuts,
    enabled: true,
    context: currentContext
  })

  const value: KeyboardShortcutsContextType = {
    shortcuts: allShortcuts,
    addShortcuts,
    removeShortcuts,
    showHelp,
    setShowHelp,
    selectedTaskIndex,
    setSelectedTaskIndex,
    selectedColumnIndex,
    setSelectedColumnIndex,
    isNavigationMode,
    setIsNavigationMode,
    currentContext,
    setCurrentContext
  }

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}