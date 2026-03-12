import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ThemeProvider } from '@/contexts/theme-context'
import { ThemeToggle } from './theme-toggle'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
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
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Helper component to test theme context
const TestComponent = ({ variant = 'button' }: { variant?: 'button' | 'dropdown' }) => (
  <ThemeProvider>
    <ThemeToggle variant={variant} />
  </ThemeProvider>
)

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Button variant', () => {
    it('renders the theme toggle button', () => {
      render(<TestComponent variant="button" />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('toggles between dark and light themes on click', async () => {
      render(<TestComponent variant="button" />)
      
      const button = screen.getByRole('button')
      
      // Initially should be dark theme (default)
      fireEvent.click(button)
      
      // Should have called localStorage.setItem
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
      })
      
      // Click again to toggle back
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
      })
    })

    it('displays correct icon for current theme', () => {
      render(<TestComponent variant="button" />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      
      // Should have an icon (svg element)
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('has proper accessibility attributes', () => {
      render(<TestComponent variant="button" />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title')
    })
  })

  describe('Dropdown variant', () => {
    it('renders the dropdown toggle', () => {
      render(<TestComponent variant="dropdown" />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('System') // Default theme
    })

    it('opens dropdown when clicked', async () => {
      render(<TestComponent variant="dropdown" />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument()
        expect(screen.getByText('Dark')).toBeInTheDocument()
        expect(screen.getByText('System')).toBeInTheDocument()
      })
    })

    it('selects theme option from dropdown', async () => {
      render(<TestComponent variant="dropdown" />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument()
      })
      
      const lightOption = screen.getByText('Light')
      fireEvent.click(lightOption)
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
      })
    })

    it('closes dropdown when backdrop is clicked', async () => {
      render(<TestComponent variant="dropdown" />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Light')).toBeInTheDocument()
      })
      
      // Click backdrop (this might need adjustment based on implementation)
      fireEvent.click(document.body)
      
      await waitFor(() => {
        expect(screen.queryByText('Light')).not.toBeInTheDocument()
      })
    })
  })

  describe('Theme persistence', () => {
    it('loads saved theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('light')
      
      render(<TestComponent variant="dropdown" />)
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme')
      
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('Light')
    })

    it('defaults to system theme when no saved preference', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      render(<TestComponent variant="dropdown" />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('System')
    })
  })

  describe('System preference detection', () => {
    it('detects system dark theme preference', () => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<TestComponent />)
      
      // Component should detect system preference
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    })
  })

  describe('Theme transitions', () => {
    it('applies theme classes to HTML element', async () => {
      render(<TestComponent variant="button" />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        // Check that HTML classes are being managed
        // This would need to be adjusted based on how the theme context works
        expect(document.documentElement.classList.contains('light') || 
               document.documentElement.classList.contains('dark')).toBe(true)
      })
    })
  })
})

describe('Theme Context', () => {
  it('provides theme context to children', () => {
    const TestChild = () => {
      return <div data-testid="test-child">Test</div>
    }
    
    render(
      <ThemeProvider>
        <TestChild />
      </ThemeProvider>
    )
    
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
  })
})