import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { 
  useDashboardPreferences,
  useDisplayPreferences,
  useAccessibilityPreferences,
  useNotificationPreferences,
  useProductivityPreferences,
  useAdvancedPreferences,
} from './use-preference-hooks'

// Mock the user preferences context
const mockGetPreference = vi.fn()
const mockUpdatePreference = vi.fn().mockResolvedValue(undefined)

vi.mock('@/contexts/user-preferences-context', () => ({
  useUserPreferences: () => ({
    getPreference: mockGetPreference,
    updatePreference: mockUpdatePreference,
    preferences: {},
    loading: false,
    error: null,
  }),
}))

// Mock theme context
const mockSetTheme = vi.fn()
vi.mock('@/contexts/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}))

describe('Preference Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPreference.mockImplementation((field: string, defaultValue?: unknown) => defaultValue)
  })

  describe('useDashboardPreferences', () => {
    it('returns default dashboard preference values', () => {
      mockGetPreference.mockImplementation((_field: string, defaultValue: unknown) => defaultValue)

      const { result } = renderHook(() => useDashboardPreferences())

      expect(result.current.defaultLandingPage).toBe('dashboard')
      expect(result.current.defaultTaskView).toBe('kanban')
      expect(result.current.tasksPerPage).toBe(20)
      expect(result.current.sidebarCollapsed).toBe(false)
      expect(result.current.defaultDateRange).toBe('month')
      expect(result.current.kanbanColumnsVisible).toEqual(
        ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done']
      )
    })

    it('calls updatePreference when setDefaultLandingPage is called', async () => {
      const { result } = renderHook(() => useDashboardPreferences())

      await act(async () => {
        await result.current.setDefaultLandingPage('tasks')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('defaultLandingPage', 'tasks')
    })

    it('calls updatePreference when setDefaultTaskView is called', async () => {
      const { result } = renderHook(() => useDashboardPreferences())

      await act(async () => {
        await result.current.setDefaultTaskView('list')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('defaultTaskView', 'list')
    })

    it('calls updatePreference when setTasksPerPage is called', async () => {
      const { result } = renderHook(() => useDashboardPreferences())

      await act(async () => {
        await result.current.setTasksPerPage(50)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('tasksPerPage', 50)
    })

    it('calls updatePreference when setSidebarCollapsed is called', async () => {
      const { result } = renderHook(() => useDashboardPreferences())

      await act(async () => {
        await result.current.setSidebarCollapsed(true)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('sidebarCollapsed', true)
    })

    it('calls updatePreference when setKanbanColumnsVisible is called', async () => {
      const { result } = renderHook(() => useDashboardPreferences())
      const columns = ['backlog', 'in-progress', 'done']

      await act(async () => {
        await result.current.setKanbanColumnsVisible(columns)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('kanbanColumnsVisible', columns)
    })

    it('calls updatePreference when setKanbanColumnOrder is called', async () => {
      const { result } = renderHook(() => useDashboardPreferences())
      const order = ['done', 'in-progress', 'backlog']

      await act(async () => {
        await result.current.setKanbanColumnOrder(order)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('kanbanColumnOrder', order)
    })

    it('calls updatePreference when setDefaultDateRange is called', async () => {
      const { result } = renderHook(() => useDashboardPreferences())

      await act(async () => {
        await result.current.setDefaultDateRange('week')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('defaultDateRange', 'week')
    })
  })

  describe('useDisplayPreferences', () => {
    it('returns default display preference values', () => {
      mockGetPreference.mockImplementation((_field: string, defaultValue: unknown) => defaultValue)

      const { result } = renderHook(() => useDisplayPreferences())

      expect(result.current.fontSize).toBe('medium')
      expect(result.current.interfaceDensity).toBe('comfortable')
      expect(result.current.accentColor).toBe('#3b82f6')
      expect(result.current.reducedMotion).toBe(false)
      expect(result.current.locale).toBe('en')
      expect(result.current.theme).toBe('light')
    })

    it('calls setTheme from theme context', async () => {
      const { result } = renderHook(() => useDisplayPreferences())

      await act(async () => {
        result.current.setTheme('dark')
      })

      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })

    it('calls updatePreference when setFontSize is called', async () => {
      const { result } = renderHook(() => useDisplayPreferences())

      await act(async () => {
        await result.current.setFontSize('large')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('fontSize', 'large')
    })

    it('calls updatePreference when setInterfaceDensity is called', async () => {
      const { result } = renderHook(() => useDisplayPreferences())

      await act(async () => {
        await result.current.setInterfaceDensity('compact')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('interfaceDensity', 'compact')
    })

    it('calls updatePreference when setAccentColor is called', async () => {
      const { result } = renderHook(() => useDisplayPreferences())

      await act(async () => {
        await result.current.setAccentColor('#ff0000')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('accentColor', '#ff0000')
    })

    it('calls updatePreference when setReducedMotion is called', async () => {
      const { result } = renderHook(() => useDisplayPreferences())

      await act(async () => {
        await result.current.setReducedMotion(true)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('reducedMotion', true)
    })

    it('calls updatePreference when setLocale is called', async () => {
      const { result } = renderHook(() => useDisplayPreferences())

      await act(async () => {
        await result.current.setLocale('de')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('locale', 'de')
    })

    it('provides applyDisplaySettings function', () => {
      const { result } = renderHook(() => useDisplayPreferences())
      expect(typeof result.current.applyDisplaySettings).toBe('function')
    })
  })

  describe('useAccessibilityPreferences', () => {
    it('returns default accessibility preference values', () => {
      mockGetPreference.mockImplementation((_field: string, defaultValue: unknown) => defaultValue)

      const { result } = renderHook(() => useAccessibilityPreferences())

      expect(result.current.screenReaderOptimized).toBe(false)
      expect(result.current.highContrastMode).toBe(false)
      expect(result.current.keyboardNavigationEnabled).toBe(true)
      expect(result.current.focusIndicatorEnhanced).toBe(false)
      expect(result.current.textScaling).toBe(1.0)
      expect(result.current.audioFeedbackEnabled).toBe(false)
    })

    it('calls updatePreference when setScreenReaderOptimized is called', async () => {
      const { result } = renderHook(() => useAccessibilityPreferences())

      await act(async () => {
        await result.current.setScreenReaderOptimized(true)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('screenReaderOptimized', true)
    })

    it('calls updatePreference when setHighContrastMode is called', async () => {
      const { result } = renderHook(() => useAccessibilityPreferences())

      await act(async () => {
        await result.current.setHighContrastMode(true)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('highContrastMode', true)
    })

    it('calls updatePreference when setKeyboardNavigationEnabled is called', async () => {
      const { result } = renderHook(() => useAccessibilityPreferences())

      await act(async () => {
        await result.current.setKeyboardNavigationEnabled(false)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('keyboardNavigationEnabled', false)
    })

    it('calls updatePreference when setFocusIndicatorEnhanced is called', async () => {
      const { result } = renderHook(() => useAccessibilityPreferences())

      await act(async () => {
        await result.current.setFocusIndicatorEnhanced(true)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('focusIndicatorEnhanced', true)
    })

    it('calls updatePreference when setTextScaling is called', async () => {
      const { result } = renderHook(() => useAccessibilityPreferences())

      await act(async () => {
        await result.current.setTextScaling(1.5)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('textScaling', 1.5)
    })

    it('calls updatePreference when setAudioFeedbackEnabled is called', async () => {
      const { result } = renderHook(() => useAccessibilityPreferences())

      await act(async () => {
        await result.current.setAudioFeedbackEnabled(true)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('audioFeedbackEnabled', true)
    })

    it('provides applyAccessibilitySettings function', () => {
      const { result } = renderHook(() => useAccessibilityPreferences())
      expect(typeof result.current.applyAccessibilitySettings).toBe('function')
    })
  })

  describe('useNotificationPreferences', () => {
    it('returns default notification preference values', () => {
      mockGetPreference.mockImplementation((_field: string, defaultValue: unknown) => defaultValue)

      const { result } = renderHook(() => useNotificationPreferences())

      expect(result.current.notificationFrequency).toBe('immediate')
      expect(result.current.quietHoursStart).toBe('22:00')
      expect(result.current.quietHoursEnd).toBe('08:00')
      expect(result.current.quietHoursEnabled).toBe(false)
    })

    it('isQuietHoursActive is false when quiet hours disabled', () => {
      mockGetPreference.mockImplementation((_field: string, defaultValue: unknown) => defaultValue)

      const { result } = renderHook(() => useNotificationPreferences())

      expect(result.current.isQuietHoursActive).toBe(false)
    })

    it('calls updatePreference when setNotificationFrequency is called', async () => {
      const { result } = renderHook(() => useNotificationPreferences())

      await act(async () => {
        await result.current.setNotificationFrequency('batched')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('notificationFrequency', 'batched')
    })

    it('calls updatePreference when setQuietHoursEnabled is called', async () => {
      const { result } = renderHook(() => useNotificationPreferences())

      await act(async () => {
        await result.current.setQuietHoursEnabled(true)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('quietHoursEnabled', true)
    })

    it('calls updatePreference when setQuietHoursStart is called', async () => {
      const { result } = renderHook(() => useNotificationPreferences())

      await act(async () => {
        await result.current.setQuietHoursStart('23:00')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('quietHoursStart', '23:00')
    })

    it('calls updatePreference when setQuietHoursEnd is called', async () => {
      const { result } = renderHook(() => useNotificationPreferences())

      await act(async () => {
        await result.current.setQuietHoursEnd('07:00')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('quietHoursEnd', '07:00')
    })
  })

  describe('useProductivityPreferences', () => {
    it('returns default productivity preference values', () => {
      mockGetPreference.mockImplementation((_field: string, defaultValue: unknown) => defaultValue)

      const { result } = renderHook(() => useProductivityPreferences())

      expect(result.current.defaultTaskPriority).toBe('medium')
      expect(result.current.autoSaveEnabled).toBe(true)
      expect(result.current.defaultExportFormat).toBe('json')
      expect(result.current.quickActionButtons).toEqual(['create-task', 'assign-task', 'change-status'])
    })

    it('calls updatePreference when setDefaultTaskPriority is called', async () => {
      const { result } = renderHook(() => useProductivityPreferences())

      await act(async () => {
        await result.current.setDefaultTaskPriority('high')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('defaultTaskPriority', 'high')
    })

    it('calls updatePreference when setAutoSaveEnabled is called', async () => {
      const { result } = renderHook(() => useProductivityPreferences())

      await act(async () => {
        await result.current.setAutoSaveEnabled(false)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('autoSaveEnabled', false)
    })

    it('calls updatePreference when setDefaultExportFormat is called', async () => {
      const { result } = renderHook(() => useProductivityPreferences())

      await act(async () => {
        await result.current.setDefaultExportFormat('csv')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('defaultExportFormat', 'csv')
    })

    it('calls updatePreference when setQuickActionButtons is called', async () => {
      const { result } = renderHook(() => useProductivityPreferences())
      const buttons = ['create-task', 'change-status']

      await act(async () => {
        await result.current.setQuickActionButtons(buttons)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('quickActionButtons', buttons)
    })

    it('calls updatePreference when setDefaultProjectId is called', async () => {
      const { result } = renderHook(() => useProductivityPreferences())

      await act(async () => {
        await result.current.setDefaultProjectId(5)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('defaultProjectId', 5)
    })
  })

  describe('useAdvancedPreferences', () => {
    it('returns default advanced preference values', () => {
      mockGetPreference.mockImplementation((_field: string, defaultValue: unknown) => defaultValue)

      const { result } = renderHook(() => useAdvancedPreferences())

      expect(result.current.keyboardShortcuts).toEqual({})
      expect(result.current.analyticsPreferences).toEqual({})
      expect(result.current.exportPreferences).toEqual({})
      expect(result.current.customSettings).toEqual({})
    })

    it('calls updatePreference when setKeyboardShortcuts is called', async () => {
      const { result } = renderHook(() => useAdvancedPreferences())
      const shortcuts = { 'save': 'ctrl+s', 'new-task': 'ctrl+n' }

      await act(async () => {
        await result.current.setKeyboardShortcuts(shortcuts)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('keyboardShortcuts', shortcuts)
    })

    it('updateKeyboardShortcut merges with existing shortcuts', async () => {
      // Return existing shortcuts
      mockGetPreference.mockImplementation((field: string, defaultValue: unknown) => {
        if (field === 'keyboardShortcuts') return { 'save': 'ctrl+s' }
        return defaultValue
      })

      const { result } = renderHook(() => useAdvancedPreferences())

      await act(async () => {
        await result.current.updateKeyboardShortcut('new-task', 'ctrl+n')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('keyboardShortcuts', {
        'save': 'ctrl+s',
        'new-task': 'ctrl+n',
      })
    })

    it('updateAnalyticsPreference merges with existing analytics prefs', async () => {
      mockGetPreference.mockImplementation((field: string, defaultValue: unknown) => {
        if (field === 'analyticsPreferences') return { tracking: true }
        return defaultValue
      })

      const { result } = renderHook(() => useAdvancedPreferences())

      await act(async () => {
        await result.current.updateAnalyticsPreference('dashboard', 'detailed')
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('analyticsPreferences', {
        tracking: true,
        dashboard: 'detailed',
      })
    })

    it('updateExportPreference merges with existing export prefs', async () => {
      mockGetPreference.mockImplementation((field: string, defaultValue: unknown) => {
        if (field === 'exportPreferences') return { format: 'csv' }
        return defaultValue
      })

      const { result } = renderHook(() => useAdvancedPreferences())

      await act(async () => {
        await result.current.updateExportPreference('includeHeaders', true)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('exportPreferences', {
        format: 'csv',
        includeHeaders: true,
      })
    })

    it('updateCustomSetting merges with existing custom settings', async () => {
      mockGetPreference.mockImplementation((field: string, defaultValue: unknown) => {
        if (field === 'customSettings') return { myKey: 'myValue' }
        return defaultValue
      })

      const { result } = renderHook(() => useAdvancedPreferences())

      await act(async () => {
        await result.current.updateCustomSetting('newKey', 42)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('customSettings', {
        myKey: 'myValue',
        newKey: 42,
      })
    })

    it('calls updatePreference when setAnalyticsPreferences is called', async () => {
      const { result } = renderHook(() => useAdvancedPreferences())
      const prefs = { enabled: true, level: 'detailed' }

      await act(async () => {
        await result.current.setAnalyticsPreferences(prefs)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('analyticsPreferences', prefs)
    })

    it('calls updatePreference when setCustomSettings is called', async () => {
      const { result } = renderHook(() => useAdvancedPreferences())
      const settings = { experimental: true }

      await act(async () => {
        await result.current.setCustomSettings(settings)
      })

      expect(mockUpdatePreference).toHaveBeenCalledWith('customSettings', settings)
    })
  })
})
