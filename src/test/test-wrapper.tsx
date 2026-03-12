import React from 'react'
import { WebSocketProvider } from '@/contexts/websocket-context'

// Mock WebSocket context for testing
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <WebSocketProvider>
      {children}
    </WebSocketProvider>
  )
}

// Test utilities
export const renderWithProviders = (ui: React.ReactElement) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper>{children}</TestWrapper>
  )
  return { Wrapper }
}