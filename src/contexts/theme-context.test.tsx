import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider, useTheme } from './theme-context'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window.matchMedia
const mockMatchMedia = vi.fn()
Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia })

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({
      matches: false, // Default to light theme
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test component to use the theme context
  function TestComponent() {
    const { theme, actualTheme, setTheme, toggleTheme } = useTheme()
    return (
      <div>
        <div data-testid="theme">{theme}</div>
        <div data-testid="actual-theme">{actualTheme}</div>
        <button data-testid="set-light" onClick={() => setTheme('light')}>
          Set Light
        </button>
        <button data-testid="set-dark" onClick={() => setTheme('dark')}>
          Set Dark
        </button>
        <button data-testid="set-system" onClick={() => setTheme('system')}>
          Set System
        </button>
        <button data-testid="toggle" onClick={toggleTheme}>
          Toggle
        </button>
      </div>
    )
  }

  it('initializes with system theme by default', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('system')
    expect(screen.getByTestId('actual-theme')).toHaveTextContent('light') // matchMedia.matches = false
  })

  it('detects dark system preference', () => {
    mockMatchMedia.mockReturnValue({
      matches: true, // Dark theme preferred
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark')
  })

  it('loads saved theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark')
  })

  it('sets theme and saves to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    act(() => {
      fireEvent.click(screen.getByTestId('set-light'))
    })

    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(screen.getByTestId('actual-theme')).toHaveTextContent('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
  })

  it('toggles from light to dark', () => {
    localStorageMock.getItem.mockReturnValue('light')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    act(() => {
      fireEvent.click(screen.getByTestId('toggle'))
    })

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('toggles from dark to light', () => {
    localStorageMock.getItem.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    act(() => {
      fireEvent.click(screen.getByTestId('toggle'))
    })

    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
  })

  it('toggles from system based on system preference', () => {
    mockMatchMedia.mockReturnValue({
      matches: true, // System prefers dark
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('system')
    expect(screen.getByTestId('actual-theme')).toHaveTextContent('dark')

    act(() => {
      fireEvent.click(screen.getByTestId('toggle'))
    })

    // Should toggle to light since system was dark
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
  })

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleSpy.mockRestore()
  })

  it('updates HTML classes when theme changes', () => {
    const html = document.documentElement

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Initially should have light theme (system default)
    expect(html.classList.contains('light')).toBe(true)
    expect(html.classList.contains('dark')).toBe(false)

    act(() => {
      fireEvent.click(screen.getByTestId('set-dark'))
    })

    expect(html.classList.contains('dark')).toBe(true)
    expect(html.classList.contains('light')).toBe(false)

    act(() => {
      fireEvent.click(screen.getByTestId('set-light'))
    })

    expect(html.classList.contains('light')).toBe(true)
    expect(html.classList.contains('dark')).toBe(false)
  })
})