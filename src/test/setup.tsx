import '@testing-library/jest-dom'
import React from 'react'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from './mocks/server'
import { mockWebsocketManager } from './mocks/websocket-manager'

// Mock Radix UI Select to prevent pointer capture issues
vi.mock('@radix-ui/react-select', () => ({
  Root: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-root' }, children),
  Group: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-group' }, children),
  Value: ({ children, ...props }: any) => React.createElement('span', { ...props, 'data-testid': 'select-value' }, children),
  Trigger: ({ children, ...props }: any) => React.createElement('button', { ...props, 'data-testid': 'select-trigger' }, children),
  Portal: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-portal' }, children),
  Content: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-content' }, children),
  Viewport: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-viewport' }, children),
  Item: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-item', onClick: props.onSelect }, children),
  ItemText: ({ children, ...props }: any) => React.createElement('span', { ...props, 'data-testid': 'select-item-text' }, children),
  ItemIndicator: ({ children, ...props }: any) => React.createElement('span', { ...props, 'data-testid': 'select-item-indicator' }, children),
  Label: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-label' }, children),
  Separator: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-separator' }, children),
  ScrollUpButton: ({ children, ...props }: any) => React.createElement('button', { ...props, 'data-testid': 'select-scroll-up' }, children),
  ScrollDownButton: ({ children, ...props }: any) => React.createElement('button', { ...props, 'data-testid': 'select-scroll-down' }, children),
  Icon: ({ children, ...props }: any) => React.createElement('span', { ...props, 'data-testid': 'select-icon' }, children),
}))



// Mock browser APIs
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: class IntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }
    callback: IntersectionObserverCallback
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
})

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: class ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }
    callback: ResizeObserverCallback
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  writable: true,
  configurable: true,
  value: localStorageMock
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  configurable: true,
  value: localStorageMock
})

// Mock HTMLElement scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  configurable: true,
  value: vi.fn(),
})

// Mock CSS.supports for modern CSS features
Object.defineProperty(window, 'CSS', {
  writable: true,
  configurable: true,
  value: {
    supports: vi.fn().mockReturnValue(true),
  },
})

// Mock pointer capture for Radix UI components
HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
HTMLElement.prototype.setPointerCapture = vi.fn()
HTMLElement.prototype.releasePointerCapture = vi.fn()
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()

// Mock pointer events
Object.defineProperty(window, 'PointerEvent', {
  writable: true,
  configurable: true,
  value: class MockPointerEvent extends Event {
    pointerId = 1
    isPrimary = true
    pointerType = 'mouse'
    constructor(type: string, init?: PointerEventInit) {
      super(type, {
        ...init,
        // Remove properties that have read-only getters
        bubbles: init?.bubbles,
        cancelable: init?.cancelable
      })
      // Only set properties that don't conflict with read-only getters
      if (init?.pointerId !== undefined) this.pointerId = init.pointerId
      if (init?.isPrimary !== undefined) this.isPrimary = init.isPrimary
      if (init?.pointerType !== undefined) this.pointerType = init.pointerType
    }
  }
})

// Mock for range APIs
if (typeof document !== 'undefined') {
  document.createRange = () => ({
    setStart: vi.fn(),
    setEnd: vi.fn(),
    commonAncestorContainer: document.body,
    collapsed: false,
    endContainer: document.body,
    endOffset: 0,
    startContainer: document.body,
    startOffset: 0,
    selectNode: vi.fn(),
    selectNodeContents: vi.fn(),
    cloneContents: vi.fn(() => document.createDocumentFragment()),
    cloneRange: vi.fn(),
    collapse: vi.fn(),
    compareBoundaryPoints: vi.fn(),
    deleteContents: vi.fn(),
    detach: vi.fn(),
    extractContents: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 })),
    getClientRects: vi.fn(() => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} })),
    insertNode: vi.fn(),
    isPointInRange: vi.fn(() => false),
    comparePoint: vi.fn(() => 0),
    intersectsNode: vi.fn(() => false),
    surroundContents: vi.fn(),
    toString: vi.fn(() => ''),
  })
}

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(() => ({
    getPropertyValue: vi.fn().mockReturnValue(''),
    setProperty: vi.fn(),
  })),
})

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

// Mock the drag and drop library
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
  Droppable: ({ children }: { children: (provided: any) => React.ReactNode }) => 
    children({
      droppableProps: {},
      innerRef: () => {},
      placeholder: null,
    }),
  Draggable: ({ children }: { children: (provided: any, snapshot: any) => React.ReactNode }) =>
    children(
      {
        draggableProps: {},
        dragHandleProps: {},
        innerRef: () => {},
      },
      {
        isDragging: false,
        isDropAnimating: false,
      }
    ),
}))

// Mock ActivityLogger
vi.mock('../lib/activity-logger', () => ({
  ActivityLogger: {
    logTaskCreated: vi.fn().mockResolvedValue(undefined),
    logTaskUpdated: vi.fn().mockResolvedValue(undefined),
    logTaskDeleted: vi.fn().mockResolvedValue(undefined),
    logTaskMoved: vi.fn().mockResolvedValue(undefined),
    logProjectCreated: vi.fn().mockResolvedValue(undefined),
    logProjectUpdated: vi.fn().mockResolvedValue(undefined),
    logProjectDeleted: vi.fn().mockResolvedValue(undefined),
    logAgentCreated: vi.fn().mockResolvedValue(undefined),
    logAgentUpdated: vi.fn().mockResolvedValue(undefined),
    logAgentDeleted: vi.fn().mockResolvedValue(undefined),
    logCommentCreated: vi.fn().mockResolvedValue(undefined),
    logCommentUpdated: vi.fn().mockResolvedValue(undefined),
    logCommentDeleted: vi.fn().mockResolvedValue(undefined),
  }
}))

// Mock NotificationService
vi.mock('../lib/notification-service', () => ({
  NotificationService: {
    createTaskAssignmentNotification: vi.fn().mockResolvedValue(undefined),
    createTaskUpdateNotification: vi.fn().mockResolvedValue(undefined),
    createCommentNotification: vi.fn().mockResolvedValue(undefined),
    createProjectNotification: vi.fn().mockResolvedValue(undefined),
    sendNotification: vi.fn().mockResolvedValue(undefined),
  }
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