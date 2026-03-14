'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useUserPreferences } from '@/contexts/user-preferences-context'
import { useTheme } from '@/contexts/theme-context'
import { 
  LandingPage, 
  TaskView, 
  FontSize, 
  InterfaceDensity, 
  DateRange, 
  NotificationFrequency, 
  ExportFormat,
  TaskPriority,
  UserPreferencesWithRelations
} from '@/types'

// Dashboard & View Preferences Hook
export function useDashboardPreferences() {
  const { getPreference, updatePreference } = useUserPreferences()
  
  const defaultLandingPage = getPreference<LandingPage>('defaultLandingPage', 'dashboard')
  const defaultTaskView = getPreference<TaskView>('defaultTaskView', 'kanban')
  const tasksPerPage = getPreference<number>('tasksPerPage', 20)
  const sidebarCollapsed = getPreference<boolean>('sidebarCollapsed', false)
  const kanbanColumnsVisible = getPreference<string[]>('kanbanColumnsVisible', ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done'])
  const kanbanColumnOrder = getPreference<string[]>('kanbanColumnOrder', ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done'])
  const defaultDateRange = getPreference<DateRange>('defaultDateRange', 'month')
  
  const updateDashboardPreference = useCallback(async (field: keyof UserPreferencesWithRelations, value: unknown) => {
    await updatePreference(field, value)
  }, [updatePreference])
  
  return {
    // Current values
    defaultLandingPage,
    defaultTaskView,
    tasksPerPage,
    sidebarCollapsed,
    kanbanColumnsVisible,
    kanbanColumnOrder,
    defaultDateRange,
    
    // Update functions
    setDefaultLandingPage: (page: LandingPage) => updateDashboardPreference('defaultLandingPage', page),
    setDefaultTaskView: (view: TaskView) => updateDashboardPreference('defaultTaskView', view),
    setTasksPerPage: (count: number) => updateDashboardPreference('tasksPerPage', count),
    setSidebarCollapsed: (collapsed: boolean) => updateDashboardPreference('sidebarCollapsed', collapsed),
    setKanbanColumnsVisible: (columns: string[]) => updateDashboardPreference('kanbanColumnsVisible', columns),
    setKanbanColumnOrder: (order: string[]) => updateDashboardPreference('kanbanColumnOrder', order),
    setDefaultDateRange: (range: DateRange) => updateDashboardPreference('defaultDateRange', range),
  }
}

// Display & Theme Preferences Hook
export function useDisplayPreferences() {
  const { getPreference, updatePreference } = useUserPreferences()
  const { theme, setTheme } = useTheme()
  
  const fontSize = getPreference<FontSize>('fontSize', 'medium')
  const interfaceDensity = getPreference<InterfaceDensity>('interfaceDensity', 'comfortable')
  const accentColor = getPreference<string>('accentColor', '#3b82f6')
  const customThemeVariant = getPreference<string>('customThemeVariant')
  const reducedMotion = getPreference<boolean>('reducedMotion', false)
  const locale = getPreference<string>('locale', 'en')
  
  const updateDisplayPreference = useCallback(async (field: keyof UserPreferencesWithRelations, value: unknown) => {
    await updatePreference(field, value)
  }, [updatePreference])
  
  // Apply CSS custom properties for real-time theme updates
  const applyDisplaySettings = useCallback(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      
      // Font size
      const fontSizeMap = { small: '14px', medium: '16px', large: '18px' }
      root.style.setProperty('--font-size-base', fontSizeMap[fontSize])
      
      // Interface density
      const densityMap = { 
        compact: { padding: '4px', spacing: '8px' },
        comfortable: { padding: '8px', spacing: '12px' },
        spacious: { padding: '12px', spacing: '16px' }
      }
      const density = densityMap[interfaceDensity]
      root.style.setProperty('--padding-base', density.padding)
      root.style.setProperty('--spacing-base', density.spacing)
      
      // Accent color
      root.style.setProperty('--accent-color', accentColor)
      
      // Reduced motion
      root.style.setProperty('--motion-reduce', reducedMotion ? 'reduce' : 'no-preference')
    }
  }, [fontSize, interfaceDensity, accentColor, reducedMotion])
  
  // Apply settings when they change
  useEffect(() => {
    applyDisplaySettings()
  }, [applyDisplaySettings])
  
  return {
    // Current values
    theme,
    fontSize,
    interfaceDensity,
    accentColor,
    customThemeVariant,
    reducedMotion,
    locale,
    
    // Update functions
    setTheme,
    setFontSize: (size: FontSize) => updateDisplayPreference('fontSize', size),
    setInterfaceDensity: (density: InterfaceDensity) => updateDisplayPreference('interfaceDensity', density),
    setAccentColor: (color: string) => updateDisplayPreference('accentColor', color),
    setCustomThemeVariant: (variant: string) => updateDisplayPreference('customThemeVariant', variant),
    setReducedMotion: (reduced: boolean) => updateDisplayPreference('reducedMotion', reduced),
    setLocale: (locale: string) => updateDisplayPreference('locale', locale),
    
    // Utility
    applyDisplaySettings,
  }
}

// Accessibility Preferences Hook
export function useAccessibilityPreferences() {
  const { getPreference, updatePreference } = useUserPreferences()
  
  const screenReaderOptimized = getPreference<boolean>('screenReaderOptimized', false)
  const highContrastMode = getPreference<boolean>('highContrastMode', false)
  const keyboardNavigationEnabled = getPreference<boolean>('keyboardNavigationEnabled', true)
  const focusIndicatorEnhanced = getPreference<boolean>('focusIndicatorEnhanced', false)
  const textScaling = getPreference<number>('textScaling', 1.0)
  const audioFeedbackEnabled = getPreference<boolean>('audioFeedbackEnabled', false)
  
  const updateAccessibilityPreference = useCallback(async (field: keyof UserPreferencesWithRelations, value: unknown) => {
    await updatePreference(field, value)
  }, [updatePreference])
  
  // Apply accessibility settings to DOM
  const applyAccessibilitySettings = useCallback(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      
      // High contrast mode
      if (highContrastMode) {
        root.classList.add('high-contrast')
      } else {
        root.classList.remove('high-contrast')
      }
      
      // Enhanced focus indicators
      if (focusIndicatorEnhanced) {
        root.classList.add('focus-enhanced')
      } else {
        root.classList.remove('focus-enhanced')
      }
      
      // Text scaling
      root.style.setProperty('--text-scale-factor', textScaling.toString())
      
      // Screen reader optimizations
      if (screenReaderOptimized) {
        root.classList.add('screen-reader-optimized')
      } else {
        root.classList.remove('screen-reader-optimized')
      }
    }
  }, [screenReaderOptimized, highContrastMode, focusIndicatorEnhanced, textScaling])
  
  // Apply settings when they change
  useEffect(() => {
    applyAccessibilitySettings()
  }, [applyAccessibilitySettings])
  
  return {
    // Current values
    screenReaderOptimized,
    highContrastMode,
    keyboardNavigationEnabled,
    focusIndicatorEnhanced,
    textScaling,
    audioFeedbackEnabled,
    
    // Update functions
    setScreenReaderOptimized: (optimized: boolean) => updateAccessibilityPreference('screenReaderOptimized', optimized),
    setHighContrastMode: (enabled: boolean) => updateAccessibilityPreference('highContrastMode', enabled),
    setKeyboardNavigationEnabled: (enabled: boolean) => updateAccessibilityPreference('keyboardNavigationEnabled', enabled),
    setFocusIndicatorEnhanced: (enhanced: boolean) => updateAccessibilityPreference('focusIndicatorEnhanced', enhanced),
    setTextScaling: (scale: number) => updateAccessibilityPreference('textScaling', scale),
    setAudioFeedbackEnabled: (enabled: boolean) => updateAccessibilityPreference('audioFeedbackEnabled', enabled),
    
    // Utility
    applyAccessibilitySettings,
  }
}

// Notification Preferences Hook
export function useNotificationPreferences() {
  const { getPreference, updatePreference } = useUserPreferences()
  
  const notificationFrequency = getPreference<NotificationFrequency>('notificationFrequency', 'immediate')
  const quietHoursStart = getPreference<string>('quietHoursStart', '22:00')
  const quietHoursEnd = getPreference<string>('quietHoursEnd', '08:00')
  const quietHoursEnabled = getPreference<boolean>('quietHoursEnabled', false)
  
  const updateNotificationPreference = useCallback(async (field: keyof UserPreferencesWithRelations, value: unknown) => {
    await updatePreference(field, value)
  }, [updatePreference])
  
  // Check if current time is within quiet hours
  const isQuietHoursActive = useMemo(() => {
    if (!quietHoursEnabled || !quietHoursStart || !quietHoursEnd) return false
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMin] = quietHoursStart.split(':').map(Number)
    const [endHour, endMin] = quietHoursEnd.split(':').map(Number)
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin
    
    if (startTime < endTime) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      return currentTime >= startTime || currentTime <= endTime
    }
  }, [quietHoursEnabled, quietHoursStart, quietHoursEnd])
  
  return {
    // Current values
    notificationFrequency,
    quietHoursStart,
    quietHoursEnd,
    quietHoursEnabled,
    isQuietHoursActive,
    
    // Update functions
    setNotificationFrequency: (frequency: NotificationFrequency) => updateNotificationPreference('notificationFrequency', frequency),
    setQuietHoursStart: (time: string) => updateNotificationPreference('quietHoursStart', time),
    setQuietHoursEnd: (time: string) => updateNotificationPreference('quietHoursEnd', time),
    setQuietHoursEnabled: (enabled: boolean) => updateNotificationPreference('quietHoursEnabled', enabled),
  }
}

// Productivity Preferences Hook
export function useProductivityPreferences() {
  const { getPreference, updatePreference } = useUserPreferences()
  
  const defaultTaskPriority = getPreference<TaskPriority>('defaultTaskPriority', 'medium')
  const defaultProjectId = getPreference<number>('defaultProjectId')
  const autoSaveEnabled = getPreference<boolean>('autoSaveEnabled', true)
  const quickActionButtons = getPreference<string[]>('quickActionButtons', ['create-task', 'assign-task', 'change-status'])
  const defaultExportFormat = getPreference<ExportFormat>('defaultExportFormat', 'json')
  
  const updateProductivityPreference = useCallback(async (field: keyof UserPreferencesWithRelations, value: unknown) => {
    await updatePreference(field, value)
  }, [updatePreference])
  
  return {
    // Current values
    defaultTaskPriority,
    defaultProjectId,
    autoSaveEnabled,
    quickActionButtons,
    defaultExportFormat,
    
    // Update functions
    setDefaultTaskPriority: (priority: TaskPriority) => updateProductivityPreference('defaultTaskPriority', priority),
    setDefaultProjectId: (projectId: number | undefined) => updateProductivityPreference('defaultProjectId', projectId),
    setAutoSaveEnabled: (enabled: boolean) => updateProductivityPreference('autoSaveEnabled', enabled),
    setQuickActionButtons: (buttons: string[]) => updateProductivityPreference('quickActionButtons', buttons),
    setDefaultExportFormat: (format: ExportFormat) => updateProductivityPreference('defaultExportFormat', format),
  }
}

// Advanced Preferences Hook
export function useAdvancedPreferences() {
  const { getPreference, updatePreference } = useUserPreferences()
  
  const keyboardShortcuts = getPreference<Record<string, string>>('keyboardShortcuts', {})
  const analyticsPreferences = getPreference<Record<string, unknown>>('analyticsPreferences', {})
  const exportPreferences = getPreference<Record<string, unknown>>('exportPreferences', {})
  const customSettings = getPreference<Record<string, unknown>>('customSettings', {})
  
  const updateAdvancedPreference = useCallback(async (field: keyof UserPreferencesWithRelations, value: unknown) => {
    await updatePreference(field, value)
  }, [updatePreference])
  
  const updateKeyboardShortcut = useCallback(async (action: string, shortcut: string) => {
    const updatedShortcuts = { ...keyboardShortcuts, [action]: shortcut }
    await updateAdvancedPreference('keyboardShortcuts', updatedShortcuts)
  }, [keyboardShortcuts, updateAdvancedPreference])
  
  const updateAnalyticsPreference = useCallback(async (key: string, value: unknown) => {
    const updatedPrefs = { ...analyticsPreferences, [key]: value }
    await updateAdvancedPreference('analyticsPreferences', updatedPrefs)
  }, [analyticsPreferences, updateAdvancedPreference])
  
  const updateExportPreference = useCallback(async (key: string, value: unknown) => {
    const updatedPrefs = { ...exportPreferences, [key]: value }
    await updateAdvancedPreference('exportPreferences', updatedPrefs)
  }, [exportPreferences, updateAdvancedPreference])
  
  const updateCustomSetting = useCallback(async (key: string, value: unknown) => {
    const updatedSettings = { ...customSettings, [key]: value }
    await updateAdvancedPreference('customSettings', updatedSettings)
  }, [customSettings, updateAdvancedPreference])
  
  return {
    // Current values
    keyboardShortcuts,
    analyticsPreferences,
    exportPreferences,
    customSettings,
    
    // Update functions
    setKeyboardShortcuts: (shortcuts: Record<string, string>) => updateAdvancedPreference('keyboardShortcuts', shortcuts),
    setAnalyticsPreferences: (prefs: Record<string, unknown>) => updateAdvancedPreference('analyticsPreferences', prefs),
    setExportPreferences: (prefs: Record<string, unknown>) => updateAdvancedPreference('exportPreferences', prefs),
    setCustomSettings: (settings: Record<string, unknown>) => updateAdvancedPreference('customSettings', settings),
    
    // Granular updates
    updateKeyboardShortcut,
    updateAnalyticsPreference,
    updateExportPreference,
    updateCustomSetting,
  }
}