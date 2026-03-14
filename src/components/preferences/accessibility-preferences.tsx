'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

import { 
  Accessibility, 
  Eye, 
  Keyboard, 
  Focus, 
  Type, 
  Volume2,
  Info,
  CheckCircle2
} from 'lucide-react'
import { useAccessibilityPreferences, useDisplayPreferences } from '@/hooks/use-preference-hooks'
import type { FontSize } from '@/types'

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

export function AccessibilityPreferences() {
  const {
    screenReaderOptimized,
    highContrastMode,
    keyboardNavigationEnabled,
    focusIndicatorEnhanced,
    textScaling,
    audioFeedbackEnabled,
    setScreenReaderOptimized,
    setHighContrastMode,
    setKeyboardNavigationEnabled,
    setFocusIndicatorEnhanced,
    setAudioFeedbackEnabled,
  } = useAccessibilityPreferences()

  const { fontSize, setFontSize } = useDisplayPreferences()
  
  return (
    <div className="space-y-6" role="region" aria-label="Accessibility preferences">
      {/* Introduction */}
      <Alert role="status">
        <Accessibility className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>
          These settings help make the application more accessible and comfortable to use. 
          Changes are applied immediately and saved to your preferences.
        </AlertDescription>
      </Alert>
      
      {/* Screen Reader Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" aria-hidden="true" />
            Screen Reader Support
          </CardTitle>
          <CardDescription>
            Optimize the interface for screen readers and assistive technologies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="screen-reader-optimized" className="text-base font-medium">
                Screen Reader Optimization
              </Label>
              <p id="screen-reader-desc" className="text-sm text-gray-600">
                Enhance compatibility with NVDA, JAWS, VoiceOver, and other screen readers
              </p>
            </div>
            <Switch
              id="screen-reader-optimized"
              checked={screenReaderOptimized}
              onCheckedChange={setScreenReaderOptimized}
              aria-describedby="screen-reader-desc"
            />
          </div>
          
          {screenReaderOptimized && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg" role="status" aria-live="polite">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                <span className="font-medium text-green-800">Screen Reader Mode Active</span>
              </div>
              <ul className="text-sm text-green-700 space-y-1" aria-label="Screen reader optimizations applied">
                <li>• Enhanced ARIA labels and descriptions</li>
                <li>• Improved landmark navigation</li>
                <li>• Additional context for dynamic content</li>
                <li>• Optimized focus management</li>
              </ul>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="audio-feedback" className="text-base font-medium">
                Audio Feedback
              </Label>
              <p id="audio-feedback-desc" className="text-sm text-gray-600">
                Play sounds for actions like clicks, notifications, and state changes
              </p>
            </div>
            <Switch
              id="audio-feedback"
              checked={audioFeedbackEnabled}
              onCheckedChange={setAudioFeedbackEnabled}
              aria-describedby="audio-feedback-desc"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Visual Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" aria-hidden="true" />
            Visual Accessibility
          </CardTitle>
          <CardDescription>
            Adjust visual elements for better visibility and readability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="high-contrast-mode" className="text-base font-medium">
                High Contrast Mode
              </Label>
              <p id="high-contrast-desc" className="text-sm text-gray-600">
                Increase contrast between text and background for better readability
              </p>
            </div>
            <Switch
              id="high-contrast-mode"
              checked={highContrastMode}
              onCheckedChange={setHighContrastMode}
              aria-describedby="high-contrast-desc"
            />
          </div>
          
          {highContrastMode && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" role="status" aria-live="polite">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span className="font-medium text-blue-800">High Contrast Mode Active</span>
              </div>
              <p className="text-sm text-blue-700">
                Colors and contrasts have been enhanced for better visibility. 
                This mode meets WCAG AAA accessibility standards.
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <fieldset>
              <legend className="text-base font-medium">
                Font Size: <span className="capitalize">{fontSize}</span>
              </legend>
              <p className="text-sm text-gray-600 mb-3">
                Choose your preferred text size for better readability
              </p>
              <div className="space-y-2" role="radiogroup" aria-label="Font size selection">
                {FONT_SIZE_OPTIONS.map((option) => (
                  <Label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="font-size"
                      value={option.value}
                      checked={fontSize === option.value}
                      onChange={() => setFontSize(option.value)}
                      className="w-4 h-4"
                      aria-label={`${option.label} font size`}
                    />
                    <span>{option.label}</span>
                  </Label>
                ))}
              </div>
            </fieldset>
            
            <div className="p-4 border rounded-lg" aria-label="Font size preview">
              <div className="font-semibold mb-2">Font Size Preview</div>
              <p className="text-gray-600">
                This is how text will appear with your current font size settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Keyboard Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            Keyboard Navigation
          </CardTitle>
          <CardDescription>
            Control keyboard navigation and interaction settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="keyboard-navigation" className="text-base font-medium">
                Enhanced Keyboard Navigation
              </Label>
              <p id="keyboard-nav-desc" className="text-sm text-gray-600">
                Enable advanced keyboard shortcuts and navigation features
              </p>
            </div>
            <Switch
              id="keyboard-navigation"
              checked={keyboardNavigationEnabled}
              onCheckedChange={setKeyboardNavigationEnabled}
              aria-describedby="keyboard-nav-desc"
            />
          </div>
          
          {keyboardNavigationEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="region" aria-label="Keyboard shortcuts reference">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Navigation Keys</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li><Badge variant="outline" className="text-xs mr-1">Tab</Badge> Move to next element</li>
                  <li><Badge variant="outline" className="text-xs mr-1">Shift+Tab</Badge> Move to previous element</li>
                  <li><Badge variant="outline" className="text-xs mr-1">Enter</Badge> Activate button/link</li>
                  <li><Badge variant="outline" className="text-xs mr-1">Space</Badge> Toggle checkbox/switch</li>
                </ul>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Arrow Keys</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li><Badge variant="outline" className="text-xs mr-1">↑↓</Badge> Navigate lists/menus</li>
                  <li><Badge variant="outline" className="text-xs mr-1">←→</Badge> Navigate tabs/sliders</li>
                  <li><Badge variant="outline" className="text-xs mr-1">Home</Badge> Go to first item</li>
                  <li><Badge variant="outline" className="text-xs mr-1">End</Badge> Go to last item</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Focus Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Focus className="h-5 w-5" aria-hidden="true" />
            Focus Management
          </CardTitle>
          <CardDescription>
            Control how focus is indicated and managed throughout the interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="focus-indicator-enhanced" className="text-base font-medium">
                Enhanced Focus Indicators
              </Label>
              <p id="focus-indicator-desc" className="text-sm text-gray-600">
                Show more prominent focus indicators for better visibility
              </p>
            </div>
            <Switch
              id="focus-indicator-enhanced"
              checked={focusIndicatorEnhanced}
              onCheckedChange={setFocusIndicatorEnhanced}
              aria-describedby="focus-indicator-desc"
            />
          </div>
          
          {focusIndicatorEnhanced && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg" role="status" aria-live="polite">
                <div className="flex items-center gap-2 mb-2">
                  <Focus className="h-4 w-4 text-purple-600" aria-hidden="true" />
                  <span className="font-medium text-purple-800">Enhanced Focus Active</span>
                </div>
                <p className="text-sm text-purple-700">
                  Focus indicators are now more visible with enhanced colors and outlines.
                </p>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Focus Indicator Preview</Label>
                <div className="flex gap-3 flex-wrap" role="group" aria-label="Focus indicator preview elements">
                  <button 
                    type="button"
                    className="px-3 py-2 bg-primary text-primary-foreground rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Button
                  </button>
                  <input 
                    type="text" 
                    placeholder="Text input"
                    aria-label="Example text input"
                    className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" 
                  />
                  <select 
                    aria-label="Example select"
                    className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <option>Select option</option>
                  </select>
                </div>
                <p className="text-xs text-gray-600">
                  Tab through the elements above to see the enhanced focus indicators in action.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Accessibility Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Summary</CardTitle>
          <CardDescription>
            Overview of your current accessibility settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Active Features</h4>
              <div className="space-y-2" role="list" aria-label="Feature status list">
                <div className="flex items-center justify-between" role="listitem">
                  <span className="text-sm">Screen Reader Optimization</span>
                  <Badge variant={screenReaderOptimized ? 'default' : 'secondary'}>
                    {screenReaderOptimized ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between" role="listitem">
                  <span className="text-sm">High Contrast Mode</span>
                  <Badge variant={highContrastMode ? 'default' : 'secondary'}>
                    {highContrastMode ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between" role="listitem">
                  <span className="text-sm">Enhanced Keyboard Navigation</span>
                  <Badge variant={keyboardNavigationEnabled ? 'default' : 'secondary'}>
                    {keyboardNavigationEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between" role="listitem">
                  <span className="text-sm">Enhanced Focus Indicators</span>
                  <Badge variant={focusIndicatorEnhanced ? 'default' : 'secondary'}>
                    {focusIndicatorEnhanced ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between" role="listitem">
                  <span className="text-sm">Audio Feedback</span>
                  <Badge variant={audioFeedbackEnabled ? 'default' : 'secondary'}>
                    {audioFeedbackEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Settings</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Font Size</span>
                  <Badge variant="outline" className="capitalize">{fontSize}</Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg" role="note">
                <h5 className="font-medium text-blue-800 text-sm mb-1">Accessibility Tip</h5>
                <p className="text-xs text-blue-700">
                  For the best experience with assistive technologies, consider enabling 
                  Screen Reader Optimization and Enhanced Focus Indicators together.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
