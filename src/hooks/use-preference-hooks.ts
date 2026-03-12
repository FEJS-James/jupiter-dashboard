'use client'

import { useState, useEffect, useCallback } from 'react'

// Types for preferences
export interface DashboardPreferences {
  landingPage: 'dashboard' | 'kanban' | 'projects' | 'analytics'
  taskView: 'kanban' | 'list' | 'calendar'
  dateRange: 'week' | 'month' | 'quarter' | 'year'
  autoRefresh: boolean
  refreshInterval: number
  showStats: boolean
  compactView: boolean
  widgetOrder: string[]
  kanbanColumnsVisible: string[]
  kanbanColumnOrder: string[]
  sidebarCollapsed: boolean
  tasksPerPage: number
}

export interface DisplayPreferences {
  theme: 'light' | 'dark' | 'system'
  density: 'compact' | 'comfortable' | 'spacious'
  sidebarWidth: number
  showAnimations: boolean
  columnWidths: Record<string, number>
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  colorScheme: string
  interfaceDensity: 'compact' | 'comfortable' | 'spacious'
  accentColor: string
  customThemeVariant?: string
  reducedMotion: boolean
  locale: string
}

export interface NotificationPreferences {
  enabled: boolean
  email: {
    taskAssigned: boolean
    taskUpdates: boolean
    mentions: boolean
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  }
  push: {
    enabled: boolean
    taskUpdates: boolean
    mentions: boolean
  }
  inApp: {
    sound: boolean
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  }
}

export interface AccessibilityPreferences {
  highContrastMode: boolean
  reduceMotion: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  screenReaderOptimizations: boolean
  enhancedKeyboardNavigation: boolean
}

export interface ProductivityPreferences {
  autoSave: boolean
  focusMode: {
    enabled: boolean
    hideSidebar: boolean
    hideNotifications: boolean
    duration: number
  }
  quickActions: {
    quickAdd: boolean
    keyboardShortcuts: boolean
    defaultPriority: 'low' | 'medium' | 'high' | 'urgent'
  }
  smartSuggestions: {
    taskRecommendations: boolean
    timeEstimates: boolean
    prioritySuggestions: boolean
  }
}

export interface AdvancedPreferences {
  developerMode: {
    enabled: boolean
    debugLogs: boolean
    showApiTiming: boolean
    customApiEndpoint?: string
  }
  dataManagement: {
    retentionPeriod: '30d' | '90d' | '1y' | '2y' | 'forever'
    autoBackup: boolean
    analytics: boolean
  }
  security: {
    sessionTimeout: number
    requireTwoFactor: boolean
    auditLogging: boolean
  }
  importExport: {
    defaultFormat: 'json' | 'yaml' | 'csv'
  }
  customization: {
    customCss?: string
  }
  keyboardShortcuts: Record<string, string>
  analyticsPreferences: Record<string, any>
  exportPreferences: Record<string, any>
  customSettings: Record<string, any>
}

// Default preferences
const defaultDashboardPreferences: DashboardPreferences = {
  landingPage: 'dashboard',
  taskView: 'kanban',
  dateRange: 'month',
  autoRefresh: true,
  refreshInterval: 30,
  showStats: true,
  compactView: false,
  widgetOrder: ['stats', 'activity', 'tasks'],
  kanbanColumnsVisible: ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done'],
  kanbanColumnOrder: ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked'],
  sidebarCollapsed: false,
  tasksPerPage: 20
}

const defaultDisplayPreferences: DisplayPreferences = {
  theme: 'system',
  density: 'comfortable',
  sidebarWidth: 280,
  showAnimations: true,
  columnWidths: {},
  fontSize: 'medium',
  colorScheme: 'default',
  interfaceDensity: 'comfortable',
  accentColor: '#3b82f6',
  customThemeVariant: undefined,
  reducedMotion: false,
  locale: 'en'
}

const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  email: {
    taskAssigned: true,
    taskUpdates: false,
    mentions: true,
    frequency: 'daily'
  },
  push: {
    enabled: true,
    taskUpdates: true,
    mentions: true
  },
  inApp: {
    sound: true,
    position: 'top-right'
  }
}

const defaultAccessibilityPreferences: AccessibilityPreferences = {
  highContrastMode: false,
  reduceMotion: false,
  fontSize: 'medium',
  screenReaderOptimizations: false,
  enhancedKeyboardNavigation: false
}

const defaultProductivityPreferences: ProductivityPreferences = {
  autoSave: true,
  focusMode: {
    enabled: false,
    hideSidebar: true,
    hideNotifications: true,
    duration: 60
  },
  quickActions: {
    quickAdd: true,
    keyboardShortcuts: true,
    defaultPriority: 'medium'
  },
  smartSuggestions: {
    taskRecommendations: false,
    timeEstimates: false,
    prioritySuggestions: false
  }
}

const defaultAdvancedPreferences: AdvancedPreferences = {
  developerMode: {
    enabled: false,
    debugLogs: false,
    showApiTiming: false
  },
  dataManagement: {
    retentionPeriod: '1y',
    autoBackup: true,
    analytics: true
  },
  security: {
    sessionTimeout: 60,
    requireTwoFactor: false,
    auditLogging: false
  },
  importExport: {
    defaultFormat: 'json'
  },
  customization: {},
  keyboardShortcuts: {},
  analyticsPreferences: {},
  exportPreferences: {},
  customSettings: {}
}

// Generic hook for preference management
function usePreferences<T>(key: string, defaultValue: T) {
  const [preferences, setPreferences] = useState<T>(defaultValue)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Load preferences from localStorage
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setPreferences({ ...defaultValue, ...parsed })
      } catch (error) {
        console.warn(`Failed to parse stored preferences for ${key}:`, error)
      }
    }
  }, [key, defaultValue])

  const updatePreferences = useCallback(async (updates: Partial<T>) => {
    setIsLoading(true)
    try {
      const newPreferences = { ...preferences, ...updates }
      setPreferences(newPreferences)
      localStorage.setItem(key, JSON.stringify(newPreferences))
      
      // Optionally sync with server
      // await fetch('/api/preferences', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ [key]: newPreferences })
      // })
    } catch (error) {
      console.error(`Failed to update preferences for ${key}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [key, preferences])

  const resetToDefaults = useCallback(async () => {
    setIsLoading(true)
    try {
      setPreferences(defaultValue)
      localStorage.setItem(key, JSON.stringify(defaultValue))
    } catch (error) {
      console.error(`Failed to reset preferences for ${key}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [key, defaultValue])

  return {
    preferences,
    updatePreferences,
    resetToDefaults,
    isLoading
  }
}

// Specific hooks for each preference category
export function useDashboardPreferences() {
  return usePreferences('dashboard-preferences', defaultDashboardPreferences)
}

export function useDisplayPreferences() {
  return usePreferences('display-preferences', defaultDisplayPreferences)
}

export function useNotificationPreferences() {
  return usePreferences('notification-preferences', defaultNotificationPreferences)
}

export function useAccessibilityPreferences() {
  return usePreferences('accessibility-preferences', defaultAccessibilityPreferences)
}

export function useProductivityPreferences() {
  return usePreferences('productivity-preferences', defaultProductivityPreferences)
}

export function useAdvancedPreferences() {
  const baseHook = usePreferences('advanced-preferences', defaultAdvancedPreferences)
  
  const exportPreferences = useCallback(() => {
    try {
      const allPreferences = {
        dashboard: JSON.parse(localStorage.getItem('dashboard-preferences') || '{}'),
        display: JSON.parse(localStorage.getItem('display-preferences') || '{}'),
        notifications: JSON.parse(localStorage.getItem('notification-preferences') || '{}'),
        accessibility: JSON.parse(localStorage.getItem('accessibility-preferences') || '{}'),
        productivity: JSON.parse(localStorage.getItem('productivity-preferences') || '{}'),
        advanced: JSON.parse(localStorage.getItem('advanced-preferences') || '{}')
      }

      const blob = new Blob([JSON.stringify(allPreferences, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `preferences-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export preferences:', error)
    }
  }, [])

  const importPreferences = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      
      // Validate and apply imported preferences
      Object.entries(imported).forEach(([key, value]) => {
        const storageKey = `${key}-preferences`
        if (value && typeof value === 'object') {
          localStorage.setItem(storageKey, JSON.stringify(value))
        }
      })
      
      // Reload the page to apply changes
      window.location.reload()
    } catch (error) {
      console.error('Failed to import preferences:', error)
      alert('Failed to import preferences. Please check the file format.')
    }
  }, [])

  return {
    ...baseHook,
    exportPreferences,
    importPreferences
  }
}