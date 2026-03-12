import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeToggle, useThemeStyles } from './theme-toggle'
import { useTheme } from '@/contexts/theme-context'

// Mock the theme context
vi.mock('@/contexts/theme-context', () => ({
  useTheme: vi.fn(),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: 'button',
    div: 'div',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Sun: () => <div data-testid="sun-icon" />,
  Moon: () => <div data-testid="moon-icon" />,
  Monitor: () => <div data-testid="monitor-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
}))

describe('ThemeToggle', () => {
  const mockSetTheme = vi.fn()
  const mockToggleTheme = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useTheme as any).mockReturnValue({
      theme: 'dark',
      actualTheme: 'dark',
      setTheme: mockSetTheme,
      toggleTheme: mockToggleTheme,
    })
  })

  it('renders button variant with dark theme icon', () => {
    render(<ThemeToggle variant="button" />)
    
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Switch to light theme')
  })

  it('renders button variant with light theme icon', () => {
    ;(useTheme as any).mockReturnValue({
      theme: 'light',
      actualTheme: 'light',
      setTheme: mockSetTheme,
      toggleTheme: mockToggleTheme,
    })

    render(<ThemeToggle variant="button" />)
    
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Switch to dark theme')
  })

  it('calls toggleTheme when button variant is clicked', () => {
    render(<ThemeToggle variant="button" />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('renders dropdown variant with theme options', () => {
    render(<ThemeToggle variant="dropdown" />)
    
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument()
  })

  it('applies correct size classes', () => {
    const { rerender } = render(<ThemeToggle size="sm" />)
    expect(screen.getByRole('button')).toHaveClass('h-8', 'w-8', 'p-1.5')

    rerender(<ThemeToggle size="lg" />)
    expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10', 'p-2.5')
  })
})

describe('useThemeStyles', () => {
  it('returns dark theme styles when actualTheme is dark', () => {
    ;(useTheme as any).mockReturnValue({
      actualTheme: 'dark',
    })

    // We need to test this hook within a component
    function TestComponent() {
      const styles = useThemeStyles()
      return (
        <div>
          <div data-testid="bg-primary" className={styles.bg.primary} />
          <div data-testid="text-primary" className={styles.text.primary} />
          <div data-testid="border-primary" className={styles.border.primary} />
        </div>
      )
    }

    render(<TestComponent />)
    
    expect(screen.getByTestId('bg-primary')).toHaveClass('bg-slate-950')
    expect(screen.getByTestId('text-primary')).toHaveClass('text-white')
    expect(screen.getByTestId('border-primary')).toHaveClass('border-slate-700')
  })

  it('returns light theme styles when actualTheme is light', () => {
    ;(useTheme as any).mockReturnValue({
      actualTheme: 'light',
    })

    function TestComponent() {
      const styles = useThemeStyles()
      return (
        <div>
          <div data-testid="bg-primary" className={styles.bg.primary} />
          <div data-testid="text-primary" className={styles.text.primary} />
          <div data-testid="border-primary" className={styles.border.primary} />
        </div>
      )
    }

    render(<TestComponent />)
    
    expect(screen.getByTestId('bg-primary')).toHaveClass('bg-white')
    expect(screen.getByTestId('text-primary')).toHaveClass('text-slate-900')
    expect(screen.getByTestId('border-primary')).toHaveClass('border-slate-200')
  })
})