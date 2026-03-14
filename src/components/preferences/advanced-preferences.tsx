'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Settings,
  Keyboard,
  BarChart,
  Download,
  Upload,
  Trash2,
  Plus,
  Edit,
  Save,
  X,
  Info,
  AlertTriangle
} from 'lucide-react'
import { useAdvancedPreferences } from '@/hooks/use-preference-hooks'

const DEFAULT_KEYBOARD_SHORTCUTS = {
  'create-task': 'ctrl+n',
  'save': 'ctrl+s',
  'search': 'ctrl+f',
  'toggle-sidebar': 'ctrl+b',
  'next-tab': 'ctrl+tab',
  'previous-tab': 'ctrl+shift+tab',
  'close-modal': 'escape',
  'help': 'f1',
  'refresh': 'f5',
  'bulk-select': 'ctrl+a',
}

const SHORTCUT_CATEGORIES = {
  'Navigation': ['toggle-sidebar', 'next-tab', 'previous-tab', 'close-modal'],
  'Actions': ['create-task', 'save', 'bulk-select'],
  'System': ['search', 'help', 'refresh'],
}

const ANALYTICS_PREFERENCES_SCHEMA = {
  'chart-type': { label: 'Default Chart Type', type: 'select', options: ['line', 'bar', 'pie', 'area'] },
  'time-range': { label: 'Default Time Range', type: 'select', options: ['week', 'month', 'quarter', 'year'] },
  'show-trends': { label: 'Show Trend Lines', type: 'boolean' },
  'group-by': { label: 'Default Grouping', type: 'select', options: ['day', 'week', 'month', 'project', 'agent'] },
}

const EXPORT_PREFERENCES_SCHEMA = {
  'include-metadata': { label: 'Include Metadata', type: 'boolean' },
  'date-format': { label: 'Date Format', type: 'select', options: ['ISO', 'US', 'EU', 'Custom'] },
  'filename-template': { label: 'Filename Template', type: 'text' },
  'auto-download': { label: 'Auto Download', type: 'boolean' },
}

export function AdvancedPreferences() {
  const {
    keyboardShortcuts,
    analyticsPreferences: analyticsPrefs,
    exportPreferences: exportPrefs,
    customSettings,
    setKeyboardShortcuts,
    setAnalyticsPreferences,
    setExportPreferences,
    setCustomSettings,
    updateKeyboardShortcut,
    updateAnalyticsPreference: updateAnalyticsPref,
    updateExportPreference: updateExportPref,
    updateCustomSetting,
  } = useAdvancedPreferences()

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [shortcutInput, setShortcutInput] = useState('')
  const [customSettingKey, setCustomSettingKey] = useState('')
  const [customSettingValue, setCustomSettingValue] = useState('')
  const [importData, setImportData] = useState('')

  const handleShortcutEdit = (action: string) => {
    setEditingShortcut(action)
    setShortcutInput(keyboardShortcuts[action] || '')
  }

  const handleShortcutSave = async (action: string) => {
    if (shortcutInput.trim()) {
      await updateKeyboardShortcut(action, shortcutInput.trim())
    }
    setEditingShortcut(null)
    setShortcutInput('')
  }

  const handleShortcutCancel = () => {
    setEditingShortcut(null)
    setShortcutInput('')
  }

  const resetShortcutsToDefault = () => {
    setKeyboardShortcuts(DEFAULT_KEYBOARD_SHORTCUTS)
  }

  const handleAddCustomSetting = () => {
    if (customSettingKey.trim() && customSettingValue.trim()) {
      updateCustomSetting(customSettingKey.trim(), customSettingValue.trim())
      setCustomSettingKey('')
      setCustomSettingValue('')
    }
  }

  const handleRemoveCustomSetting = (key: string) => {
    const newSettings = { ...customSettings }
    delete newSettings[key]
    setCustomSettings(newSettings)
  }

  const handleUpdateAnalyticsPreference = (key: string, value: unknown) => {
    updateAnalyticsPref(key, value)
  }

  const handleUpdateExportPreference = (key: string, value: unknown) => {
    updateExportPref(key, value)
  }

  const exportAllSettings = () => {
    const allSettings = {
      keyboardShortcuts,
      analyticsPreferences: analyticsPrefs,
      exportPreferences: exportPrefs,
      customSettings,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(allSettings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `advanced-preferences-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importAllSettings = () => {
    try {
      const parsed = JSON.parse(importData) as Record<string, unknown>

      if (parsed.keyboardShortcuts) setKeyboardShortcuts(parsed.keyboardShortcuts as Record<string, string>)
      if (parsed.analyticsPreferences) setAnalyticsPreferences(parsed.analyticsPreferences as Record<string, unknown>)
      if (parsed.exportPreferences) setExportPreferences(parsed.exportPreferences as Record<string, unknown>)
      if (parsed.customSettings) setCustomSettings(parsed.customSettings as Record<string, unknown>)

      setImportData('')
    } catch (error) {
      console.error('Failed to import settings:', error)
    }
  }

  return (
    <div className="space-y-6" role="region" aria-label="Advanced preferences">
      <Tabs defaultValue="keyboard-shortcuts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keyboard-shortcuts" className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            Shortcuts
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" aria-hidden="true" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Settings className="h-4 w-4" aria-hidden="true" />
            Custom
          </TabsTrigger>
        </TabsList>

        {/* Keyboard Shortcuts */}
        <TabsContent value="keyboard-shortcuts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Keyboard className="h-5 w-5" aria-hidden="true" />
                    Keyboard Shortcuts
                  </CardTitle>
                  <CardDescription>
                    Customize keyboard shortcuts for faster navigation and actions
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={resetShortcutsToDefault} aria-label="Reset keyboard shortcuts to defaults">
                  Reset to Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(SHORTCUT_CATEGORIES).map(([category, shortcuts]) => (
                <div key={category}>
                  <h4 className="font-medium text-lg mb-3">{category}</h4>
                  <div className="space-y-3">
                    {shortcuts.map((action) => {
                      const currentShortcut = keyboardShortcuts[action] || DEFAULT_KEYBOARD_SHORTCUTS[action as keyof typeof DEFAULT_KEYBOARD_SHORTCUTS] || ''
                      const isEditing = editingShortcut === action

                      return (
                        <div key={action} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium capitalize">{action.replace('-', ' ')}</div>
                            <div className="text-sm text-gray-600">
                              {action === 'create-task' && 'Create a new task'}
                              {action === 'save' && 'Save current form or document'}
                              {action === 'search' && 'Open search dialog'}
                              {action === 'toggle-sidebar' && 'Show/hide sidebar navigation'}
                              {action === 'next-tab' && 'Switch to next tab'}
                              {action === 'previous-tab' && 'Switch to previous tab'}
                              {action === 'close-modal' && 'Close modal dialogs'}
                              {action === 'help' && 'Open help documentation'}
                              {action === 'refresh' && 'Refresh current page'}
                              {action === 'bulk-select' && 'Select all items'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={shortcutInput}
                                  onChange={(e) => setShortcutInput(e.target.value)}
                                  placeholder="e.g., ctrl+n"
                                  className="w-32 text-sm"
                                  aria-label={`New shortcut for ${action.replace('-', ' ')}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleShortcutSave(action)
                                    } else if (e.key === 'Escape') {
                                      handleShortcutCancel()
                                    }
                                  }}
                                />
                                <Button size="sm" onClick={() => handleShortcutSave(action)} aria-label={`Save shortcut for ${action.replace('-', ' ')}`}>
                                  <Save className="h-3 w-3" aria-hidden="true" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleShortcutCancel} aria-label="Cancel shortcut edit">
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  {currentShortcut}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShortcutEdit(action)}
                                  aria-label={`Edit shortcut for ${action.replace('-', ' ')}`}
                                >
                                  <Edit className="h-3 w-3" aria-hidden="true" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <Alert>
                <Info className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  Use standard key combinations like &quot;ctrl+key&quot;, &quot;shift+key&quot;, or &quot;alt+key&quot;.
                  Some shortcuts may conflict with browser shortcuts.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Preferences */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" aria-hidden="true" />
                Analytics Preferences
              </CardTitle>
              <CardDescription>
                Configure default settings for analytics and reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(ANALYTICS_PREFERENCES_SCHEMA).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">{config.label}</Label>
                    <p className="text-sm text-gray-600 capitalize">
                      {key.replace('-', ' ')} configuration
                    </p>
                  </div>

                  <div>
                    {config.type === 'boolean' ? (
                      <Switch
                        checked={analyticsPrefs[key] as boolean || false}
                        onCheckedChange={(checked) => handleUpdateAnalyticsPreference(key, checked)}
                        aria-label={config.label}
                      />
                    ) : config.type === 'select' ? (
                      <select
                        value={analyticsPrefs[key] as string || ('options' in config ? config.options[0] : '')}
                        onChange={(e) => handleUpdateAnalyticsPreference(key, e.target.value)}
                        className="px-3 py-1 border rounded text-sm"
                        aria-label={config.label}
                      >
                        {'options' in config && config.options.map((option) => (
                          <option key={option} value={option} className="capitalize">
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={analyticsPrefs[key] as string || ''}
                        onChange={(e) => handleUpdateAnalyticsPreference(key, e.target.value)}
                        className="w-32 text-sm"
                        aria-label={config.label}
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Preferences */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" aria-hidden="true" />
                Export Preferences
              </CardTitle>
              <CardDescription>
                Configure default settings for data exports and downloads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(EXPORT_PREFERENCES_SCHEMA).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">{config.label}</Label>
                    <p className="text-sm text-gray-600 capitalize">
                      {key.replace('-', ' ')} setting
                    </p>
                  </div>

                  <div>
                    {config.type === 'boolean' ? (
                      <Switch
                        checked={exportPrefs[key] as boolean || false}
                        onCheckedChange={(checked) => handleUpdateExportPreference(key, checked)}
                        aria-label={config.label}
                      />
                    ) : config.type === 'select' ? (
                      <select
                        value={exportPrefs[key] as string || ('options' in config ? config.options[0] : '')}
                        onChange={(e) => handleUpdateExportPreference(key, e.target.value)}
                        className="px-3 py-1 border rounded text-sm"
                        aria-label={config.label}
                      >
                        {'options' in config && config.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={exportPrefs[key] as string || ''}
                        onChange={(e) => handleUpdateExportPreference(key, e.target.value)}
                        placeholder={key === 'filename-template' ? 'export-{date}-{type}' : ''}
                        className="w-48 text-sm"
                        aria-label={config.label}
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Settings */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" aria-hidden="true" />
                Custom Settings
              </CardTitle>
              <CardDescription>
                Add your own custom settings and configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Setting */}
              <div className="p-4 border-2 border-dashed rounded-lg">
                <Label className="font-medium mb-3 block">Add Custom Setting</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Setting key"
                    value={customSettingKey}
                    onChange={(e) => setCustomSettingKey(e.target.value)}
                    aria-label="Custom setting key"
                  />
                  <Input
                    placeholder="Setting value"
                    value={customSettingValue}
                    onChange={(e) => setCustomSettingValue(e.target.value)}
                    aria-label="Custom setting value"
                  />
                  <Button onClick={handleAddCustomSetting} disabled={!customSettingKey || !customSettingValue}>
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Existing Settings */}
              {Object.keys(customSettings).length > 0 && (
                <div className="space-y-3">
                  <Label className="font-medium">Current Custom Settings</Label>
                  {Object.entries(customSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">{key}</Label>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveCustomSetting(key)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Remove custom setting: ${key}`}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import/Export Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings Backup</CardTitle>
              <CardDescription>
                Export or import your advanced settings configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Button onClick={exportAllSettings} className="flex items-center gap-2">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export Advanced Settings
                </Button>
              </div>

              <div className="space-y-3">
                <Label htmlFor="import-settings">Import Advanced Settings</Label>
                <Textarea
                  id="import-settings"
                  placeholder="Paste exported settings JSON here..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="h-32"
                />
                <Button
                  onClick={importAllSettings}
                  disabled={!importData.trim()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Import Settings
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  Importing settings will overwrite your current advanced preferences.
                  Make sure to export your current settings first if you want to keep them.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}