import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// Test the DashboardContent component directly (the page uses next/dynamic with ssr:false
// which renders a loading skeleton in test environments without a browser)
import { DashboardContent } from '@/components/dashboard/dashboard-content'

describe('Home Page', () => {
  it('renders the AgentFlow welcome heading', async () => {
    render(<DashboardContent />)
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome to AgentFlow/i })).toBeInTheDocument()
    })
  })

  it('displays the dashboard description', async () => {
    render(<DashboardContent />)
    
    await waitFor(() => {
      expect(screen.getByText(/Your autonomous development pipeline is ready for action/i)).toBeInTheDocument()
    })
  })

  it('contains dashboard action buttons', async () => {
    render(<DashboardContent />)
    
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
    render(<DashboardContent />)
    
    await waitFor(() => {
      // Use getAllByText for elements that appear multiple times
      expect(screen.getAllByText(/Active Projects/i)).toHaveLength(2) // Stats card + chart title
      expect(screen.getByText(/Available Agents/i)).toBeInTheDocument()
      expect(screen.getByText(/Completed Tasks/i)).toBeInTheDocument()
      expect(screen.getByText(/Active Tasks/i)).toBeInTheDocument()
    })
  })
})