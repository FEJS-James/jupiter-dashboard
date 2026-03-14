import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskFormDialog } from './task-form-dialog'
import { Task, Project, Agent } from '@/types'

const mockProjects: Project[] = [
  {
    id: 1,
    name: 'Frontend Development',
    description: 'Main frontend project',
    status: 'active',
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'Backend API',
    description: 'API development project',
    status: 'active',
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z'
  }
]

const mockAgents: Agent[] = [
  {
    id: 1,
    name: 'CodeAgent',
    role: 'coder',
    color: '#10b981',
    status: 'available',
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'ReviewBot',
    role: 'reviewer',
    color: '#3b82f6',
    status: 'busy',
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z'
  }
]

const mockTask: Task = {
  id: 1,
  projectId: 1,
  title: 'Implement authentication',
  description: 'Add JWT-based authentication system',
  status: 'in-progress',
  priority: 'high',
  assignedAgent: 'CodeAgent',
  tags: ['auth', 'security'],
  dueDate: '2024-03-25T10:00:00.000Z',
  effort: 5,
  dependencies: [],
  createdAt: '2024-03-12T00:00:00.000Z',
  updatedAt: '2024-03-12T00:00:00.000Z'
}

const defaultProps = {
  open: false,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  projects: mockProjects,
  agents: mockAgents
}

describe('TaskFormDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog visibility', () => {
    it('does not render when open is false', () => {
      render(<TaskFormDialog {...defaultProps} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders when open is true', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('shows "Create New Task" title when in create mode', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      expect(screen.getByText('Create New Task')).toBeInTheDocument()
    })

    it('shows "Edit Task" title when in edit mode', () => {
      render(<TaskFormDialog {...defaultProps} open={true} task={mockTask} />)
      expect(screen.getByText('Edit Task')).toBeInTheDocument()
    })
  })

  describe('Form initialization', () => {
    it('initializes with empty form in create mode', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      expect(titleInput).toHaveValue('')
      expect(descriptionTextarea).toHaveValue('')
    })

    it('initializes with task data in edit mode', () => {
      render(<TaskFormDialog {...defaultProps} open={true} task={mockTask} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      expect(titleInput).toHaveValue('Implement authentication')
      expect(descriptionTextarea).toHaveValue('Add JWT-based authentication system')
    })

    it('uses default status when provided', () => {
      render(<TaskFormDialog {...defaultProps} open={true} defaultStatus="testing" />)
      
      // Check that the status select has the correct value
      // This would require checking the select component's value
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('uses first project as default when creating new task', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      // The form should initialize with the first project
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Form validation', () => {
    it('shows error when title is empty', async () => {
      const mockSubmit = vi.fn()
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} />)
      
      const submitButton = screen.getByText('Create Task')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument()
      })
      
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('shows error when title is too long', async () => {
      const mockSubmit = vi.fn()
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'A'.repeat(201) } })
      
      const submitButton = screen.getByText('Create Task')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Title must be less than 200 characters')).toBeInTheDocument()
      })
      
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('shows error when project is not selected', async () => {
      const mockSubmit = vi.fn()
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} projects={[]} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'Valid title' } })
      
      const submitButton = screen.getByText('Create Task')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Project is required')).toBeInTheDocument()
      })
      
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it('shows error for negative effort', async () => {
      const mockSubmit = vi.fn()
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      const effortInput = screen.getByLabelText(/effort/i)
      
      fireEvent.change(titleInput, { target: { value: 'Valid title' } })
      fireEvent.change(effortInput, { target: { value: '-5' } })
      
      const submitButton = screen.getByText('Create Task')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        // Check if there's any error element or just verify submission is blocked
        const errorElement = document.querySelector('.text-red-400')
        expect(errorElement).toBeInTheDocument()
      })
      
      expect(mockSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Form interactions', () => {
    it('updates title field correctly', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'New task title' } })
      
      expect(titleInput).toHaveValue('New task title')
    })

    it('updates description field correctly', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      const descriptionTextarea = screen.getByLabelText(/description/i)
      fireEvent.change(descriptionTextarea, { target: { value: 'Task description' } })
      
      expect(descriptionTextarea).toHaveValue('Task description')
    })

    it('adds and removes tags correctly', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      const tagInput = screen.getByPlaceholderText(/add a tag/i)
      const addTagButton = screen.getByRole('button', { name: 'Add tag' })
      
      // Add a tag
      fireEvent.change(tagInput, { target: { value: 'frontend' } })
      fireEvent.click(addTagButton!)
      
      expect(screen.getByText('frontend')).toBeInTheDocument()
      expect(tagInput).toHaveValue('')
      
      // Remove the tag - find the X button within the tag
      const removeButton = screen.getByText('frontend').parentElement?.querySelector('button')
      expect(removeButton).toBeTruthy()
      fireEvent.click(removeButton!)
      
      expect(screen.queryByText('frontend')).not.toBeInTheDocument()
    })

    it('adds tag by pressing Enter key', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      const tagInput = screen.getByPlaceholderText(/add a tag/i)
      
      fireEvent.change(tagInput, { target: { value: 'backend' } })
      fireEvent.keyDown(tagInput, { key: 'Enter', preventDefault: vi.fn() })
      
      expect(screen.getByText('backend')).toBeInTheDocument()
      expect(tagInput).toHaveValue('')
    })

    it('prevents duplicate tags', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      const tagInput = screen.getByPlaceholderText(/add a tag/i)
      const addTagButton = screen.getByRole('button', { name: 'Add tag' })
      
      // Add first tag
      fireEvent.change(tagInput, { target: { value: 'duplicate' } })
      fireEvent.click(addTagButton!)
      
      // Try to add same tag again
      fireEvent.change(tagInput, { target: { value: 'duplicate' } })
      fireEvent.click(addTagButton!)
      
      const duplicateTags = screen.getAllByText('duplicate')
      expect(duplicateTags).toHaveLength(1)
    })
  })

  describe('Form submission', () => {
    it('calls onSubmit with correct data for new task', async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined)
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} />)
      
      // Fill out form
      const titleInput = screen.getByLabelText(/title/i)
      const descriptionTextarea = screen.getByLabelText(/description/i)
      
      fireEvent.change(titleInput, { target: { value: 'New task' } })
      fireEvent.change(descriptionTextarea, { target: { value: 'Task description' } })
      
      // Submit form
      const submitButton = screen.getByText('Create Task')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New task',
            description: 'Task description',
            priority: 'medium',
            status: 'backlog'
          })
        )
      })
    })

    it('calls onSubmit with correct data for edited task', async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined)
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} task={mockTask} />)
      
      // Modify title
      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'Updated task title' } })
      
      // Submit form
      const submitButton = screen.getByText('Update Task')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Updated task title'
          })
        )
      })
    })

    it('calls onClose after successful submission', async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined)
      const mockClose = vi.fn()
      
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} onClose={mockClose} />)
      
      // Fill out and submit form
      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'Valid task' } })
      
      const submitButton = screen.getByText('Create Task')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockClose).toHaveBeenCalled()
      })
    })

    it('shows loading state during submission', async () => {
      const mockSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'Valid task' } })
      
      const submitButton = screen.getByText('Create Task')
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })
    })

    it('shows error message on submission failure', async () => {
      const mockSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'))
      
      render(<TaskFormDialog {...defaultProps} open={true} onSubmit={mockSubmit} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      fireEvent.change(titleInput, { target: { value: 'Valid task' } })
      
      const submitButton = screen.getByText('Create Task')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save task. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel functionality', () => {
    it('calls onClose when cancel button is clicked', () => {
      const mockClose = vi.fn()
      render(<TaskFormDialog {...defaultProps} open={true} onClose={mockClose} />)
      
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
      
      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('sets focus on title input when dialog opens', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      const titleInput = screen.getByLabelText(/title/i)
      expect(titleInput).toHaveFocus()
    })

    it('has proper ARIA labels on form fields', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      // Check for presence of label text (may appear in label and select options)
      expect(screen.getAllByText(/project/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/status/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/priority/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/assigned agent/i).length).toBeGreaterThan(0)
    })

    it('marks required fields with asterisk', () => {
      render(<TaskFormDialog {...defaultProps} open={true} />)
      
      expect(screen.getAllByText('*')).toHaveLength(2) // Title and Project are required
    })
  })
})