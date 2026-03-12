'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Moon, Sun, Monitor, Palette, Type, Zap, Globe } from 'lucide-react'
import { useDisplayPreferences } from '@/hooks/use-preference-hooks'
import { FontSize, InterfaceDensity } from '@/types'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Clean and bright appearance' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes in low light' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
]

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; description: string; size: string }[] = [
  { value: 'small', label: 'Small', description: 'Compact text for more content', size: '14px' },
  { value: 'medium', label: 'Medium', description: 'Default comfortable size', size: '16px' },
  { value: 'large', label: 'Large', description: 'Larger text for easier reading', size: '18px' },
]

const DENSITY_OPTIONS: { value: InterfaceDensity; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: 'More information in less space' },
  { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing and content' },
  { value: 'spacious', label: 'Spacious', description: 'Extra spacing for easier navigation' },
]

const ACCENT_COLORS = [
  { value: '#3b82f6', label: 'Blue', class: 'bg-blue-500' },
  { value: '#ef4444', label: 'Red', class: 'bg-red-500' },
  { value: '#10b981', label: 'Green', class: 'bg-green-500' },
  { value: '#f59e0b', label: 'Yellow', class: 'bg-yellow-500' },
  { value: '#8b5cf6', label: 'Purple', class: 'bg-purple-500' },
  { value: '#ec4899', label: 'Pink', class: 'bg-pink-500' },
  { value: '#06b6d4', label: 'Cyan', class: 'bg-cyan-500' },
  { value: '#84cc16', label: 'Lime', class: 'bg-lime-500' },
]

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
]

export function DisplayPreferences() {
  const {
    theme,
    fontSize,
    interfaceDensity,
    accentColor,
    customThemeVariant,
    reducedMotion,
    locale,
    setTheme,
    setFontSize,
    setInterfaceDensity,
    setAccentColor,
    setCustomThemeVariant,
    setReducedMotion,
    setLocale,
  } = useDisplayPreferences()
  
  const [customColor, setCustomColor] = useState(accentColor)
  const [showCustomColorInput, setShowCustomColorInput] = useState(!ACCENT_COLORS.some(color => color.value === accentColor))
  
  const handleCustomColorChange = (color: string) => {
    setCustomColor(color)
    setAccentColor(color)
  }
  
  const handleAccentColorSelect = (color: string) => {
    setAccentColor(color)
    setCustomColor(color)
    setShowCustomColorInput(false)
  }
  
  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <label
                  key={option.value}
                  className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                    theme === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={theme === option.value}
                    onChange={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                    className="sr-only"
                  />
                  <Icon className={`h-8 w-8 mb-2 ${
                    theme === option.value ? 'text-primary' : 'text-gray-500'
                  }`} />
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600 text-center">{option.description}</div>
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </CardTitle>
          <CardDescription>
            Adjust text size and readability settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Font Size</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FONT_SIZE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    fontSize === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="font-size"
                    value={option.value}
                    checked={fontSize === option.value}
                    onChange={() => setFontSize(option.value)}
                    className="sr-only"
                  />
                  <div className={`mb-2 font-medium`} style={{ fontSize: option.size }}>
                    Aa
                  </div>
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-600 text-center">{option.description}</div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <Label className="text-base font-medium">Sample Text</Label>
            <div className={`p-4 border rounded-lg bg-accent/10`} style={{ fontSize: FONT_SIZE_OPTIONS.find(o => o.value === fontSize)?.size }}>
              <div className="font-semibold mb-2">Task Management Dashboard</div>
              <div className="text-gray-600">
                This is how your text will appear with the current font size settings. 
                You can adjust the size to make it more comfortable for reading and working.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Interface Density */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Interface Density
          </CardTitle>
          <CardDescription>
            Control how much information is displayed and spacing between elements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DENSITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                  interfaceDensity === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <input
                  type="radio"
                  name="interface-density"
                  value={option.value}
                  checked={interfaceDensity === option.value}
                  onChange={() => setInterfaceDensity(option.value)}
                  className="sr-only"
                />
                
                {/* Visual representation of density */}
                <div className="mb-3 h-12 flex flex-col justify-center">
                  {option.value === 'compact' && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-gray-300 rounded"></div>
                      <div className="h-1.5 bg-gray-300 rounded"></div>
                      <div className="h-1.5 bg-gray-300 rounded"></div>
                      <div className="h-1.5 bg-gray-300 rounded"></div>
                    </div>
                  )}
                  {option.value === 'comfortable' && (
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-300 rounded"></div>
                      <div className="h-2 bg-gray-300 rounded"></div>
                      <div className="h-2 bg-gray-300 rounded"></div>
                    </div>
                  )}
                  {option.value === 'spacious' && (
                    <div className="space-y-3">
                      <div className="h-2.5 bg-gray-300 rounded"></div>
                      <div className="h-2.5 bg-gray-300 rounded"></div>
                    </div>
                  )}
                </div>
                
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle>Accent Color</CardTitle>
          <CardDescription>
            Choose the primary color used for buttons, links, and highlights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Color Presets</Label>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleAccentColorSelect(color.value)}
                  className={`group relative w-12 h-12 rounded-lg ${color.class} transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                  title={color.label}
                >
                  {accentColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Custom Color</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomColorInput(!showCustomColorInput)}
              >
                {showCustomColorInput ? 'Hide' : 'Custom'}
              </Button>
            </div>
            
            {showCustomColorInput && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-16 h-10 p-1 border"
                  />
                  <Input
                    type="text"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                <div className="p-3 rounded-lg border" style={{ backgroundColor: customColor + '10' }}>
                  <div className="text-sm text-gray-600">
                    Preview: This is how your custom accent color will appear
                  </div>
                  <Button size="sm" className="mt-2" style={{ backgroundColor: customColor }}>
                    Sample Button
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Animation and Motion */}
      <Card>
        <CardHeader>
          <CardTitle>Animation and Motion</CardTitle>
          <CardDescription>
            Control animations and transitions throughout the interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reduced-motion" className="text-base font-medium">
                Reduce Motion
              </Label>
              <p className="text-sm text-gray-600">
                Minimize animations and transitions for a calmer experience or accessibility needs
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={reducedMotion}
              onCheckedChange={setReducedMotion}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Language and Localization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language and Localization
          </CardTitle>
          <CardDescription>
            Set your preferred language and regional settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="locale">Language</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger id="locale" className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.flag}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-gray-600">
            <strong>Note:</strong> Full internationalization is in development. 
            Currently, language selection affects date formatting and some interface elements.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}