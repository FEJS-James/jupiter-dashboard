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
import { useAccessibilityPreferences } from '@/hooks/use-preference-hooks'

export function AccessibilityPreferences() {
  const {
    preferences,
    updatePreferences,
    isLoading
  } = useAccessibilityPreferences()
  
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Alert>
        <Accessibility className="h-4 w-4" />
        <AlertDescription>
          These settings help make the application more accessible and comfortable to use. 
          Changes are applied immediately and saved to your preferences.
        </AlertDescription>
      </Alert>
      
      {/* Screen Reader Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
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
              <p className="text-sm text-gray-600">
                Enhance compatibility with NVDA, JAWS, VoiceOver, and other screen readers
              </p>
            </div>
            <Switch
              id="screen-reader-optimized"
              checked={preferences.screenReaderOptimizations}
              onCheckedChange={(value) => updatePreferences({ screenReaderOptimizations: value })}
            />
          </div>
          
          {preferences.screenReaderOptimizations && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Screen Reader Mode Active</span>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
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
              <p className="text-sm text-gray-600">
                Play sounds for actions like clicks, notifications, and state changes
              </p>
            </div>
            <Switch
              id="audio-feedback"
              checked={false}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Visual Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
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
              <p className="text-sm text-gray-600">
                Increase contrast between text and background for better readability
              </p>
            </div>
            <Switch
              id="high-contrast-mode"
              checked={preferences.highContrastMode}
              onCheckedChange={(value) => updatePreferences({ highContrastMode: value })}
            />
          </div>
          
          {preferences.highContrastMode && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">High Contrast Mode Active</span>
              </div>
              <p className="text-sm text-blue-700">
                Colors and contrasts have been enhanced for better visibility. 
                This mode meets WCAG AAA accessibility standards.
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="font-size" className="text-base font-medium">
                Font Size: {preferences.fontSize}
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Choose your preferred text size for better readability
              </p>
              <div className="space-y-2">
                {['small', 'medium', 'large', 'extra-large'].map((size) => (
                  <Label key={size} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="font-size"
                      value={size}
                      checked={preferences.fontSize === size}
                      onChange={() => updatePreferences({ fontSize: size as any })}
                      className="w-4 h-4"
                    />
                    <span className="capitalize">{size.replace('-', ' ')}</span>
                  </Label>
                ))}
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
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
            <Keyboard className="h-5 w-5" />
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
              <p className="text-sm text-gray-600">
                Enable advanced keyboard shortcuts and navigation features
              </p>
            </div>
            <Switch
              id="keyboard-navigation"
              checked={preferences.enhancedKeyboardNavigation}
              onCheckedChange={(value) => updatePreferences({ enhancedKeyboardNavigation: value })}
            />
          </div>
          
          {preferences.enhancedKeyboardNavigation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Focus className="h-5 w-5" />
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
              <p className="text-sm text-gray-600">
                Show more prominent focus indicators for better visibility
              </p>
            </div>
            <Switch
              id="focus-indicator-enhanced"
              checked={false}
              disabled={true}
            />
          </div>
          
          {false && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Focus className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-800">Enhanced Focus Active</span>
                </div>
                <p className="text-sm text-purple-700">
                  Focus indicators are now more visible with enhanced colors and outlines.
                </p>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Focus Indicator Preview</Label>
                <div className="flex gap-3 flex-wrap">
                  <button className="px-3 py-2 bg-primary text-primary-foreground rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                    Button
                  </button>
                  <input 
                    type="text" 
                    placeholder="Text input" 
                    className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" 
                  />
                  <select className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Screen Reader Optimization</span>
                  <Badge variant={preferences.screenReaderOptimizations ? 'default' : 'secondary'}>
                    {preferences.screenReaderOptimizations ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">High Contrast Mode</span>
                  <Badge variant={preferences.highContrastMode ? 'default' : 'secondary'}>
                    {preferences.highContrastMode ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Enhanced Keyboard Navigation</span>
                  <Badge variant={preferences.enhancedKeyboardNavigation ? 'default' : 'secondary'}>
                    {preferences.enhancedKeyboardNavigation ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Enhanced Focus Indicators</span>
                  <Badge variant="secondary">
                    Disabled
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Audio Feedback</span>
                  <Badge variant="secondary">
                    Disabled
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Settings</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Font Size</span>
                  <Badge variant="outline">{preferences.fontSize}</Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
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