'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface KeyboardShortcut {
  key: string
  modifiers?: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  }
  handler: () => void
  description: string
  category: string
  context?: string[] // Which pages/contexts this shortcut applies to
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  context?: string
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  context
}: UseKeyboardShortcutsOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const sequenceRef = useRef<string[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement
    if (!activeElement) return false
    
    const tagName = activeElement.tagName.toLowerCase()
    const contentEditable = activeElement.getAttribute('contenteditable')
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      contentEditable === 'true' ||
      activeElement.hasAttribute('contenteditable')
    )
  }, [])

  const isModalOpen = useCallback(() => {
    // Check for common modal/dialog indicators
    return (
      document.querySelector('[role="dialog"]') ||
      document.querySelector('[data-state="open"]') ||
      document.querySelector('.fixed.inset-0') ||
      document.querySelector('[data-radix-dialog-overlay]')
    ) !== null
  }, [])

  const matchesContext = useCallback((shortcut: KeyboardShortcut) => {
    if (!shortcut.context) return true
    if (context && shortcut.context.includes(context)) return true
    
    // Check pathname context
    const currentPage = pathname.split('/')[1] || 'dashboard'
    return shortcut.context.some(ctx => 
      ctx === currentPage || 
      pathname.includes(ctx)
    )
  }, [context, pathname])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return
    
    const key = event.key.toLowerCase()
    const modifiers = {
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    }

    // Handle sequence shortcuts (like 'g + d')
    sequenceRef.current.push(key)
    
    // Clear sequence after timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      sequenceRef.current = []
    }, 1000)

    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      if (!matchesContext(shortcut)) return false

      const shortcutKeys = shortcut.key.split(' + ').map(k => k.toLowerCase())
      const shortcutModifiers = shortcut.modifiers || {}

      // Single key shortcut
      if (shortcutKeys.length === 1) {
        const matches = shortcutKeys[0] === key &&
          !!shortcutModifiers.ctrl === modifiers.ctrl &&
          !!shortcutModifiers.shift === modifiers.shift &&
          !!shortcutModifiers.alt === modifiers.alt &&
          !!shortcutModifiers.meta === modifiers.meta

        return matches
      }

      // Sequence shortcut (like 'g + d')
      if (shortcutKeys.length === 2 && sequenceRef.current.length >= 2) {
        const lastTwo = sequenceRef.current.slice(-2)
        return lastTwo[0] === shortcutKeys[0] && lastTwo[1] === shortcutKeys[1]
      }

      return false
    })

    if (matchingShortcut) {
      // Don't trigger shortcuts when input is focused unless explicitly allowed
      if (isInputFocused() && !matchingShortcut.key.includes('ctrl') && !matchingShortcut.key.includes('escape')) {
        return
      }

      // Don't trigger shortcuts when modal is open unless it's an escape key
      if (isModalOpen() && matchingShortcut.key !== 'escape') {
        return
      }

      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault()
      }

      matchingShortcut.handler()
      sequenceRef.current = [] // Clear sequence after successful match
    }
  }, [enabled, shortcuts, matchesContext, isInputFocused, isModalOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleKeyDown])

  return {
    registerShortcut: (shortcut: KeyboardShortcut) => {
      // This could be used to dynamically register shortcuts
    },
    unregisterShortcut: (key: string) => {
      // This could be used to dynamically unregister shortcuts
    }
  }
}

// Global navigation shortcuts
export function useGlobalNavigation() {
  const router = useRouter()

  return [
    {
      key: 'g + d',
      handler: () => router.push('/'),
      description: 'Go to Dashboard',
      category: 'Navigation'
    },
    {
      key: 'g + b',
      handler: () => router.push('/tasks'),
      description: 'Go to Kanban Board',
      category: 'Navigation'
    },
    {
      key: 'g + p',
      handler: () => router.push('/projects'),
      description: 'Go to Projects',
      category: 'Navigation'
    },
    {
      key: 'g + a',
      handler: () => router.push('/analytics'),
      description: 'Go to Analytics',
      category: 'Navigation'
    },
    {
      key: 'g + n',
      handler: () => router.push('/notifications'),
      description: 'Go to Notifications',
      category: 'Navigation'
    },
    {
      key: 'g + s',
      handler: () => {
        // Open settings modal or page
        console.log('Open settings')
      },
      description: 'Open Settings',
      category: 'Navigation'
    }
  ] as KeyboardShortcut[]
}