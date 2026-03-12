import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Home from './page'

describe('Home Page', () => {
  it('renders the AgentFlow welcome heading', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome to AgentFlow/i })).toBeInTheDocument()
    })
  })

  it('displays the dashboard description', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText(/Your autonomous development pipeline is ready for action/i)).toBeInTheDocument()
    })
  })

  it('contains dashboard action buttons', async () => {
    render(<Home />)
    
    await waitFor(() => {
      const newProjectButton = screen.getByRole('button', { name: /Create new project/i })
      const browseProjectsButton = screen.getByRole('button', { name: /Browse existing projects/i })
      const viewActivityButton = screen.getByRole('button', { name: /View activity log/i })
      const settingsButton = screen.getByRole('button', { name: /Open settings/i })
      
      expect(newProjectButton).toBeInTheDocument()
      expect(browseProjectsButton).toBeInTheDocument()
      expect(viewActivityButton).toBeInTheDocument()
      expect(settingsButton).toBeInTheDocument()
    })
  })

  it('displays dashboard stats cards', async () => {
    render(<Home />)
    
    await waitFor(() => {
      // Use getAllByText for elements that appear multiple times
      expect(screen.getAllByText(/Active Projects/i)).toHaveLength(2) // Stats card + chart title
      expect(screen.getByText(/Available Agents/i)).toBeInTheDocument()
      expect(screen.getByText(/Completed Tasks/i)).toBeInTheDocument()
      expect(screen.getByText(/Active Tasks/i)).toBeInTheDocument()
    })
  })
})