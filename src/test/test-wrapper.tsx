import React from 'react'
import { render } from '@testing-library/react'
import { WebSocketProvider } from '@/contexts/websocket-context'
import { ThemeProvider } from '@/contexts/theme-context'

// Enhanced test wrapper with all necessary providers
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    </ThemeProvider>
  )
}

// Test utilities
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper>{children}</TestWrapper>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}

// Export commonly used testing utilities
export { TestWrapper as default }

// Mock theme context for isolated testing
export const MockThemeProvider: React.FC<{ children: React.ReactNode; theme?: 'light' | 'dark' }> = ({ 
  children, 
  theme = 'light' 
}) => {
  const mockThemeContext = {
    theme: 'system' as const,
    actualTheme: theme,
    setTheme: () => {},
    toggleTheme: () => {}
  }
  
  return (
    <div data-theme={theme} className={theme}>
      {children}
    </div>
  )
}