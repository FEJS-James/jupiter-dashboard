import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from './mocks/server'
import { mockWebsocketManager } from './mocks/websocket-manager'

// Mock the WebSocket manager module
vi.mock('../lib/websocket-manager', () => ({
  websocketManager: mockWebsocketManager,
  WebSocketManager: class MockWebSocketManager {
    static getInstance() {
      return mockWebsocketManager;
    }
  }
}))

// Mock the WebSocket context module
vi.mock('../contexts/websocket-context', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => children,
  useWebSocket: () => ({
    socket: null,
    connected: true,
    users: [],
    activities: [],
    joinBoard: vi.fn(),
    leaveBoard: vi.fn(),
    updatePresence: vi.fn(),
    sendMessage: vi.fn(),
    isConnected: () => true,
    reconnect: vi.fn(),
    disconnect: vi.fn(),
    getConnectionStatus: () => 'connected',
    clearActivities: vi.fn(),
  })
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    input: 'input',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useInView: () => true,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
}))

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
  console.log('Mock WebSocket manager ready status:', mockWebsocketManager.isReady())
  console.log('Mock WebSocket manager IO instance:', mockWebsocketManager.getIO() !== null)
})

// Reset handlers after each test `important for test isolation`
afterEach(() => server.resetHandlers())

// Clean up after all tests are done
afterAll(() => server.close())