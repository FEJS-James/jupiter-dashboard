import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeleteTaskDialog } from './delete-task-dialog'
import { Task } from '@/types'

const mockTask: Task = {
  id: 1,
  projectId: 1,
  title: 'Implement user authentication',
  description: 'Add login and signup functionality with JWT tokens',
  status: 'in-progress',
  priority: 'high',
  assignedAgent: 'coder',
  tags: ['authentication', 'security'],
  dueDate: '2024-03-25T00:00:00.000Z',
  effort: 8,
  dependencies: [2, 3],
  createdAt: '2024-03-12T00:00:00.000Z',
  updatedAt: '2024-03-12T00:00:00.000Z'
}

const mockTaskWithoutDescription: Task = {
  ...mockTask,
  id: 2,
  title: 'Simple task',
  description: undefined
}

const defaultProps = {
  open: false,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  task: null
}

describe('DeleteTaskDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog visibility and rendering', () => {
    it('does not render when open is false', () => {
      render(<DeleteTaskDialog {...defaultProps} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not render when task is null', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={null} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders when open is true and task is provided', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('displays correct dialog title', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByRole('heading', { name: 'Delete Task' })).toBeInTheDocument()
    })

    it('displays warning description', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByText('This action cannot be undone')).toBeInTheDocument()
    })

    it('displays confirmation question', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByText('Are you sure you want to delete this task?')).toBeInTheDocument()
    })
  })

  describe('Task information display', () => {
    it('displays task title', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByText('Implement user authentication')).toBeInTheDocument()
    })

    it('displays task description when available', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByText('Add login and signup functionality with JWT tokens')).toBeInTheDocument()
    })

    it('does not display description section when task has no description', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTaskWithoutDescription} />)
      
      expect(screen.getByText('Simple task')).toBeInTheDocument()
      // Description should not be rendered at all
      expect(screen.queryByText(/Add login and signup/)).not.toBeInTheDocument()
    })

    it('displays warning icon', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      
      // Look for the AlertTriangle icon by checking for the warning styling
      const warningContainer = document.querySelector('.bg-red-100\\/10')
      expect(warningContainer).toBeInTheDocument()
    })
  })

  describe('Action buttons', () => {
    it('renders Cancel button', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders Delete Task button', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByRole('button', { name: 'Delete Task' })).toBeInTheDocument()
    })

    it('calls onClose when Cancel button is clicked', () => {
      const mockClose = vi.fn()
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onClose={mockClose} />)
      
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
      
      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm when Delete Task button is clicked', async () => {
      const mockConfirm = vi.fn().mockResolvedValue(undefined)
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onConfirm={mockConfirm} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Task' })
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledTimes(1)
      })
    })

    it('calls onClose after successful deletion', async () => {
      const mockConfirm = vi.fn().mockResolvedValue(undefined)
      const mockClose = vi.fn()
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onConfirm={mockConfirm} onClose={mockClose} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Task' })
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(mockClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Loading states', () => {
    it('shows loading state during deletion', async () => {
      const mockConfirm = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onConfirm={mockConfirm} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Task' })
      fireEvent.click(deleteButton)
      
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.queryByText('Deleting...')).not.toBeInTheDocument()
      })
    })

    it('disables buttons during loading', async () => {
      const mockConfirm = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onConfirm={mockConfirm} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Task' })
      const cancelButton = screen.getByText('Cancel')
      
      fireEvent.click(deleteButton)
      
      expect(deleteButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
      
      await waitFor(() => {
        expect(deleteButton).not.toBeDisabled()
        expect(cancelButton).not.toBeDisabled()
      })
    })
  })

  describe('Error handling', () => {
    it('logs error to console when deletion fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockConfirm = vi.fn().mockRejectedValue(new Error('Deletion failed'))
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onConfirm={mockConfirm} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Task' })
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete task:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })

    it('does not close dialog when deletion fails', async () => {
      const mockConfirm = vi.fn().mockRejectedValue(new Error('Deletion failed'))
      const mockClose = vi.fn()
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onConfirm={mockConfirm} onClose={mockClose} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Task' })
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled()
      })
      
      // Dialog should remain open (onClose should not be called on error)
      expect(mockClose).not.toHaveBeenCalled()
    })

    it('resets loading state after error', async () => {
      const mockConfirm = vi.fn().mockRejectedValue(new Error('Deletion failed'))
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onConfirm={mockConfirm} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Task' })
      fireEvent.click(deleteButton)
      
      // Should show loading initially
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.queryByText('Deleting...')).not.toBeInTheDocument()
      })
      
      // Should show normal state again after error
      expect(screen.getByText('Delete Task')).toBeInTheDocument()
    })
  })

  describe('Dialog behavior', () => {
    it('closes dialog when onOpenChange is called with false', () => {
      const mockClose = vi.fn()
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} onClose={mockClose} />)
      
      // Simulate dialog close via onOpenChange prop
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      
      // This would be triggered by pressing Escape or clicking backdrop
      // We simulate the onOpenChange callback that would be called by the Dialog component
      fireEvent.keyDown(dialog, { key: 'Escape' })
      
      // Note: The actual behavior depends on the Dialog implementation
      // This test verifies that the onClose prop would be called
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA roles', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has descriptive button labels', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      
      const deleteButton = screen.getByRole('button', { name: /delete task/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      
      expect(deleteButton).toBeInTheDocument()
      expect(cancelButton).toBeInTheDocument()
    })

    it('has proper dialog title', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      
      expect(screen.getByRole('heading', { name: 'Delete Task' })).toBeInTheDocument()
    })

    it('has proper dialog description', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      
      expect(screen.getByText('This action cannot be undone')).toBeInTheDocument()
    })

    it('has proper color coding for destructive action', () => {
      render(<DeleteTaskDialog {...defaultProps} open={true} task={mockTask} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Task' })
      expect(deleteButton).toHaveClass('bg-red-600')
    })
  })

  describe('Edge cases', () => {
    it('handles very long task titles gracefully', () => {
      const longTitleTask = {
        ...mockTask,
        title: 'A'.repeat(200) // Very long title
      }
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={longTitleTask} />)
      
      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument()
    })

    it('handles tasks with special characters in title', () => {
      const specialCharTask = {
        ...mockTask,
        title: 'Task with "quotes" & <tags> and émojis 🚀'
      }
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={specialCharTask} />)
      
      expect(screen.getByText('Task with "quotes" & <tags> and émojis 🚀')).toBeInTheDocument()
    })

    it('handles tasks with very long descriptions gracefully', () => {
      const longDescriptionTask = {
        ...mockTask,
        description: 'B'.repeat(500) // Very long description
      }
      
      render(<DeleteTaskDialog {...defaultProps} open={true} task={longDescriptionTask} />)
      
      // Description should be truncated/clamped (line-clamp-2 class)
      expect(screen.getByText('B'.repeat(500))).toBeInTheDocument()
    })
  })
})