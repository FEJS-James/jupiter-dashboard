'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Search, 
  Settings, 
  Palette, 
  Bell, 
  Accessibility, 
  Zap, 
  LayoutDashboard,
  AlertCircle,
  CheckCircle2 
} from 'lucide-react'
import { useUserPreferences } from '@/contexts/user-preferences-context'
import { PREFERENCE_CATEGORIES, type PreferenceCategoryName } from '@/types'

// Import preference category components — lazy loaded for code splitting
import {
  LazyDashboardPreferences as DashboardPreferences,
  LazyDisplayPreferences as DisplayPreferences,
  LazyNotificationPreferencesPanel as NotificationPreferencesPanel,
  LazyAccessibilityPreferences as AccessibilityPreferences,
  LazyProductivityPreferences as ProductivityPreferences,
  LazyAdvancedPreferences as AdvancedPreferences,
} from '@/components/preferences/lazy-preferences'

const CATEGORY_ICONS = {
  dashboard: LayoutDashboard,
  display: Palette,
  notifications: Bell,
  accessibility: Accessibility,
  productivity: Zap,
  advanced: Settings,
} as const

const CATEGORY_COMPONENTS = {
  dashboard: DashboardPreferences,
  display: DisplayPreferences,
  notifications: NotificationPreferencesPanel,
  accessibility: AccessibilityPreferences,
  productivity: ProductivityPreferences,
  advanced: AdvancedPreferences,
} as const

export default function PreferencesPage() {
  const { 
    preferences, 
    loading, 
    error, 
    resetPreferences, 
    exportPreferences, 
    importPreferences 
  } = useUserPreferences()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<PreferenceCategoryName>('dashboard')
  const [isResetting, setIsResetting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Filter categories based on search term
  const filteredCategories = PREFERENCE_CATEGORIES.filter(category =>
    category.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const handleReset = async () => {
    try {
      setIsResetting(true)
      await resetPreferences()
      setSuccessMessage('Preferences have been reset to defaults')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Failed to reset preferences:', error)
    } finally {
      setIsResetting(false)
    }
  }
  
  const handleExport = async () => {
    try {
      await exportPreferences('json')
      setSuccessMessage('Preferences exported successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Failed to export preferences:', error)
    }
  }
  
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    try {
      setIsImporting(true)
      const text = await file.text()
      const importData = JSON.parse(text)
      
      await importPreferences(importData, false) // Merge by default
      setSuccessMessage('Preferences imported successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Failed to import preferences:', error)
    } finally {
      setIsImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }
  
  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading preferences...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6" role="main" aria-label="User preferences">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Preferences</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Customize your experience and personalize your workspace
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex items-center gap-2"
            >
              <label htmlFor="import-preferences" className="cursor-pointer">
                <Upload className="h-4 w-4" />
                Import
              </label>
            </Button>
            <input
              id="import-preferences"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isImporting}
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
            Reset All
          </Button>
        </div>
      </div>
      
      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Search */}
      <div className="relative max-w-md" role="search" aria-label="Search preferences">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
        <Input
          placeholder="Search preferences..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          aria-label="Search preferences by name or description"
        />
      </div>
      
      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PreferenceCategoryName)} className="w-full" aria-label="Preference categories">
            {/* Tabs List */}
            <div className="border-b">
              <TabsList className="flex sm:grid sm:w-full sm:grid-cols-6 h-auto p-1 bg-transparent overflow-x-auto">
                {filteredCategories.map((category) => {
                  const Icon = CATEGORY_ICONS[category.name as PreferenceCategoryName]
                  return (
                    <TabsTrigger
                      key={category.name}
                      value={category.name}
                      className="flex flex-col items-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-2 min-w-[80px] shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <Icon className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium text-xs sm:text-sm">{category.displayName}</div>
                        <div className="text-xs text-gray-500 hidden sm:block">
                          {category.description}
                        </div>
                      </div>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
            
            {/* Tab Content */}
            {filteredCategories.map((category) => {
              const Component = CATEGORY_COMPONENTS[category.name as PreferenceCategoryName]
              return (
                <TabsContent key={category.name} value={category.name} className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                      {React.createElement(CATEGORY_ICONS[category.name as PreferenceCategoryName], { className: "h-6 w-6" })}
                      {category.displayName}
                    </h2>
                    {category.description && (
                      <p className="text-gray-600 mt-1">{category.description}</p>
                    )}
                  </div>
                  
                  <Component />
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Footer Info */}
      <div className="text-sm text-gray-500 text-center">
        <p>
          Preferences are automatically saved and synchronized across your sessions.{' '}
          {preferences && (
            <>
              Last updated: {new Date(preferences.updatedAt).toLocaleDateString()} at{' '}
              {new Date(preferences.updatedAt).toLocaleTimeString()}
            </>
          )}
        </p>
      </div>
    </div>
  )
}