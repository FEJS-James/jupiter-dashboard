import '@testing-library/jest-dom'
import React from 'react'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from './mocks/server'
import { mockWebsocketManager } from './mocks/websocket-manager'

// Mock framer-motion to prevent animation issues in tests
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      // Return a forwardRef component for any motion.xxx element
      return React.forwardRef(({ children, ...props }: any, ref: any) => {
        // Strip framer-motion specific props
        const validProps: Record<string, any> = {}
        const invalidProps = ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'layout', 'layoutId', 'onAnimationStart', 'onAnimationComplete', 'drag', 'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition', 'onDrag', 'onDragStart', 'onDragEnd']
        for (const [key, val] of Object.entries(props)) {
          if (!invalidProps.includes(key)) {
            validProps[key] = val
          }
        }
        return React.createElement(prop as string, { ...validProps, ref }, children)
      })
    }
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: any) => ({
    get: () => initial,
    set: vi.fn(),
    onChange: vi.fn(),
  }),
  useTransform: () => ({
    get: () => 0,
    set: vi.fn(),
  }),
  useSpring: () => ({
    get: () => 0,
    set: vi.fn(),
  }),
  useInView: () => [null, true],
  useReducedMotion: () => false,
}))

// Mock Radix UI Select — implements onValueChange so tests can interact with select dropdowns
vi.mock('@radix-ui/react-select', async () => {
  const React = await import('react')
  const SelectContext = React.createContext<{ onValueChange?: (value: string) => void }>({})

  return {
    Root: ({ children, onValueChange, ...props }: any) => {
      return React.createElement(
        SelectContext.Provider,
        { value: { onValueChange } },
        React.createElement('div', { ...props, 'data-testid': 'select-root' }, children)
      )
    },
    Group: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-group' }, children),
    Value: ({ children, placeholder, ...props }: any) => React.createElement('span', { ...props, 'data-testid': 'select-value' }, children || placeholder),
    Trigger: ({ children, ...props }: any) => React.createElement('button', { ...props, 'data-testid': 'select-trigger' }, children),
    Portal: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-portal' }, children),
    Content: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-content' }, children),
    Viewport: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-viewport' }, children),
    Item: ({ children, value, ...props }: any) => {
      const ctx = React.useContext(SelectContext)
      return React.createElement('div', {
        ...props,
        'data-testid': 'select-item',
        'data-value': value,
        role: 'option',
        onClick: () => ctx.onValueChange?.(value),
      }, children)
    },
    ItemText: ({ children, ...props }: any) => React.createElement('span', { ...props, 'data-testid': 'select-item-text' }, children),
    ItemIndicator: ({ children, ...props }: any) => React.createElement('span', { ...props, 'data-testid': 'select-item-indicator' }, children),
    Label: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-label' }, children),
    Separator: ({ children, ...props }: any) => React.createElement('div', { ...props, 'data-testid': 'select-separator' }, children),
    ScrollUpButton: ({ children, ...props }: any) => React.createElement('button', { ...props, 'data-testid': 'select-scroll-up' }, children),
    ScrollDownButton: ({ children, ...props }: any) => React.createElement('button', { ...props, 'data-testid': 'select-scroll-down' }, children),
    Icon: ({ children, ...props }: any) => React.createElement('span', { ...props, 'data-testid': 'select-icon' }, children),
  }
})



// Guard browser-only mocks — API route tests use @vitest-environment node
const isBrowser = typeof window !== 'undefined'

// Mock browser APIs
if (isBrowser) {
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
      addListener: vi.fn(),
      removeListener: vi.fn(),
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
          bubbles: init?.bubbles,
          cancelable: init?.cancelable
        })
        if (init?.pointerId !== undefined) this.pointerId = init.pointerId
        if (init?.isPrimary !== undefined) this.isPrimary = init.isPrimary
        if (init?.pointerType !== undefined) this.pointerType = init.pointerType
      }
    }
  })
} // end isBrowser

// Mock Radix UI Popover to render content inline (jsdom doesn't support portals well)
vi.mock('@radix-ui/react-popover', async () => {
  const React = await import('react')
  return {
    Root: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'popover-root' }, children),
    Trigger: React.forwardRef(({ children, asChild, ...props }: any, ref: any) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement, { ...props, ref })
      }
      return React.createElement('button', { ...props, ref }, children)
    }),
    Portal: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Content: React.forwardRef(({ children, ...props }: any, ref: any) => 
      React.createElement('div', { ...props, ref, 'data-testid': 'popover-content' }, children)
    ),
    Anchor: ({ children, ...props }: any) => React.createElement('div', props, children),
    Close: ({ children, ...props }: any) => React.createElement('button', props, children),
    Arrow: () => null,
  }
})

// Note: document.createRange is natively supported by jsdom.
// Do NOT mock it — mocking it breaks userEvent click handling
// which relies on native Selection/Range APIs.

// Mock getComputedStyle (browser-only)
if (isBrowser) {
  Object.defineProperty(window, 'getComputedStyle', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      getPropertyValue: vi.fn().mockReturnValue(''),
      setProperty: vi.fn(),
    })),
  })
}

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
    connectionStatus: 'connected',
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
  Droppable: ({ children }: { children: (provided: any, snapshot: any) => React.ReactNode }) => 
    children(
      {
        droppableProps: {},
        innerRef: () => {},
        placeholder: null,
      },
      {
        isDraggingOver: false,
        draggingOverWith: null,
        draggingFromThisWith: null,
        isUsingPlaceholder: false,
      }
    ),
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