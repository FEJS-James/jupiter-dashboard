import React, { createContext, useContext } from 'react'
import { ConnectedUser, UserPresence, ActivityEvent } from '@/contexts/websocket-context'

// Mock WebSocket context for testing
interface MockWebSocketContextType {
  socket: null
  connected: boolean
  users: ConnectedUser[]
  activities: ActivityEvent[]
  joinBoard: (boardId: string, user: ConnectedUser) => void
  leaveBoard: (boardId?: string) => void
  updatePresence: (presence: UserPresence) => void
  sendMessage: (message: string) => void
  isConnected: () => boolean
  reconnect: () => void
  disconnect: () => void
  getConnectionStatus: () => 'connected' | 'disconnected' | 'reconnecting'
  clearActivities: () => void
}

const MockWebSocketContext = createContext<MockWebSocketContextType | null>(null)

export const MockWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockContextValue: MockWebSocketContextType = {
    socket: null,
    connected: true, // Mock as connected
    users: [],
    activities: [],
    joinBoard: () => {},
    leaveBoard: () => {},
    updatePresence: () => {},
    sendMessage: () => {},
    isConnected: () => true,
    reconnect: () => {},
    disconnect: () => {},
    getConnectionStatus: () => 'connected',
    clearActivities: () => {},
  }

  return (
    <MockWebSocketContext.Provider value={mockContextValue}>
      {children}
    </MockWebSocketContext.Provider>
  )
}

export const useMockWebSocket = () => {
  const context = useContext(MockWebSocketContext)
  if (!context) {
    throw new Error('useMockWebSocket must be used within a MockWebSocketProvider')
  }
  return context
}