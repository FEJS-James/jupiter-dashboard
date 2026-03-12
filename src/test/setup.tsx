import '@testing-library/jest-dom'
import React from 'react'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from './mocks/server'
import { mockWebsocketManager } from './mocks/websocket-manager'

// Mock framer-motion - MUST be at the top for proper hoisting
vi.mock('framer-motion', () => {
  const createMockMotionComponent = (element: string) => {
    return ({ children, ...props }: any) => {
      // Remove animation-specific props to avoid warnings
      const { 
        animate, 
        initial, 
        exit, 
        transition, 
        whileHover, 
        whileTap,
        variants,
        ...cleanProps 
      } = props;
      return React.createElement(element, cleanProps, children);
    };
  };
  
  return {
    motion: {
      div: createMockMotionComponent('div'),
      span: createMockMotionComponent('span'),
      button: createMockMotionComponent('button'),
      input: createMockMotionComponent('input'),
      form: createMockMotionComponent('form'),
      nav: createMockMotionComponent('nav'),
      header: createMockMotionComponent('header'),
      section: createMockMotionComponent('section'),
      article: createMockMotionComponent('article'),
      aside: createMockMotionComponent('aside'),
      main: createMockMotionComponent('main'),
      ul: createMockMotionComponent('ul'),
      li: createMockMotionComponent('li'),
      p: createMockMotionComponent('p'),
      h1: createMockMotionComponent('h1'),
      h2: createMockMotionComponent('h2'),
      h3: createMockMotionComponent('h3'),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children ? React.createElement(React.Fragment, null, children) : null,
    useInView: () => true,
    useAnimation: () => ({ 
      start: vi.fn().mockResolvedValue(undefined), 
      stop: vi.fn(),
      set: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn()
    }),
    useSpring: () => ({ 
      x: 0, 
      y: 0, 
      scale: 1, 
      opacity: 1,
      set: vi.fn(),
      get: vi.fn()
    }),
    useTransform: (value: any, input: any, output: any) => output?.[0] || 0,
    useMotionValue: (initialValue: any) => ({ 
      get: () => initialValue,
      set: vi.fn(),
      onChange: vi.fn(),
      destroy: vi.fn()
    }),
    useScroll: () => ({ 
      scrollY: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
      scrollYProgress: { get: () => 0, set: vi.fn(), onChange: vi.fn() }
    }),
    useMotionTemplate: () => '',
    animate: vi.fn().mockResolvedValue(undefined),
    useDragControls: () => ({ start: vi.fn(), stop: vi.fn() }),
    useMotionValueEvent: vi.fn(),
  }
})

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
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()

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

// Mock framer-motion with comprehensive coverage
vi.mock('framer-motion', () => {
  const createMockMotionComponent = (element: string) => {
    return ({ children, ...props }: any) => {
      // Remove animation-specific props to avoid warnings
      const { 
        animate, 
        initial, 
        exit, 
        transition, 
        whileHover, 
        whileTap,
        variants,
        ...cleanProps 
      } = props;
      return React.createElement(element, cleanProps, children);
    };
  };
  
  return {
    motion: {
      div: createMockMotionComponent('div'),
      span: createMockMotionComponent('span'),
      button: createMockMotionComponent('button'),
      input: createMockMotionComponent('input'),
      form: createMockMotionComponent('form'),
      nav: createMockMotionComponent('nav'),
      header: createMockMotionComponent('header'),
      section: createMockMotionComponent('section'),
      article: createMockMotionComponent('article'),
      aside: createMockMotionComponent('aside'),
      main: createMockMotionComponent('main'),
      ul: createMockMotionComponent('ul'),
      li: createMockMotionComponent('li'),
      p: createMockMotionComponent('p'),
      h1: createMockMotionComponent('h1'),
      h2: createMockMotionComponent('h2'),
      h3: createMockMotionComponent('h3'),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children ? React.createElement(React.Fragment, null, children) : null,
    useInView: () => true,
    useAnimation: () => ({ 
      start: vi.fn().mockResolvedValue(undefined), 
      stop: vi.fn(),
      set: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn()
    }),
    useSpring: () => ({ 
      x: 0, 
      y: 0, 
      scale: 1, 
      opacity: 1,
      set: vi.fn(),
      get: vi.fn()
    }),
    useTransform: (value: any, input: any, output: any) => output?.[0] || 0,
    useMotionValue: (initialValue: any) => ({ 
      get: () => initialValue,
      set: vi.fn(),
      onChange: vi.fn(),
      destroy: vi.fn()
    }),
    useScroll: () => ({ 
      scrollY: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
      scrollYProgress: { get: () => 0, set: vi.fn(), onChange: vi.fn() }
    }),
    useMotionTemplate: () => '',
    animate: vi.fn().mockResolvedValue(undefined),
    useDragControls: () => ({ start: vi.fn(), stop: vi.fn() }),
    useMotionValueEvent: vi.fn(),
  }
})

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