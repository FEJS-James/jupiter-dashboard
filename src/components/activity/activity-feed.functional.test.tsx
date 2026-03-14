import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ActivityFeed } from './activity-feed'

// Simple functional tests for Activity Feed core functionality
describe('ActivityFeed Core Functionality', () => {
  it('should successfully load and display activity data', async () => {
    render(<ActivityFeed />)

    // Should show the component title and description
    expect(screen.getByText('Activity Feed')).toBeInTheDocument()
    expect(screen.getByText('Real-time activity across all projects')).toBeInTheDocument()

    // Wait for data to load from MSW mock
    await waitFor(
      () => {
        expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Should display multiple activities
    expect(screen.getByText(/CodeAgent moved "Test Task"/)).toBeInTheDocument()
    expect(screen.getByText(/ReviewAgent commented on/)).toBeInTheDocument()
    expect(screen.getByText(/DeployAgent joined the system/)).toBeInTheDocument()
    expect(screen.getByText(/ReviewAgent completed task/)).toBeInTheDocument()
  })

  it('should display activity with proper formatting and timestamps', async () => {
    render(<ActivityFeed />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Should display agent information (agent names appear in description text and agent info spans)
    expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    expect(screen.getByText(/ReviewAgent commented on/)).toBeInTheDocument()
    expect(screen.getByText(/DeployAgent joined/)).toBeInTheDocument()

    // Should display project and task information in descriptions
    expect(screen.getByText(/CodeAgent created task "Test Task" in Test Project 1/)).toBeInTheDocument()
  })

  it('should handle compact mode', async () => {
    render(<ActivityFeed compact={true} />)

    // Should still load and display data in compact mode
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Should display the same activities
    expect(screen.getByText(/CodeAgent moved "Test Task"/)).toBeInTheDocument()
  })

  it('should hide filters when showFilters is false', () => {
    render(<ActivityFeed showFilters={false} />)

    // Should not show filter inputs
    expect(screen.queryByPlaceholderText('Search activities...')).not.toBeInTheDocument()
    expect(screen.queryByText('All Projects')).not.toBeInTheDocument()
    expect(screen.queryByText('All Agents')).not.toBeInTheDocument()
    expect(screen.queryByText('All Types')).not.toBeInTheDocument()
  })

  it('should show refresh button', async () => {
    render(<ActivityFeed />)

    // Should show refresh button (SVG icon)
    const refreshButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg[class*="lucide-refresh-cw"]')
    )
    expect(refreshButton).toBeInTheDocument()
  })

  it('should support different activity types', async () => {
    render(<ActivityFeed />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Should display different types of activities
    expect(screen.getByText(/created task/)).toBeInTheDocument()  // task_created
    expect(screen.getByText(/moved "Test Task"/)).toBeInTheDocument()  // task_moved
    expect(screen.getByText(/commented on/)).toBeInTheDocument()  // comment_added
    expect(screen.getByText(/joined the system/)).toBeInTheDocument()  // agent_joined
    expect(screen.getByText(/completed task/)).toBeInTheDocument()  // task_completed
  })

  it('should display agent information with roles', async () => {
    render(<ActivityFeed />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Agent roles are displayed in "AgentName • role" format within span elements
    // Multiple activities may have the same agent, so use getAllByText
    expect(screen.getAllByText(/CodeAgent • coder/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ReviewAgent • reviewer/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/DeployAgent • deployer/).length).toBeGreaterThan(0)
  })

  it('should handle custom title and description', () => {
    const customTitle = 'My Activity Log'
    const customDescription = 'Custom activity description'
    
    render(<ActivityFeed title={customTitle} description={customDescription} />)

    expect(screen.getByText(customTitle)).toBeInTheDocument()
    expect(screen.getByText(customDescription)).toBeInTheDocument()
  })

  it('should show activity details expansion buttons for activities with details', async () => {
    render(<ActivityFeed />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Should have expand buttons (chevron down icons) for activities with details
    const chevronButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg[class*="lucide-chevron-down"]')
    )
    expect(chevronButtons.length).toBeGreaterThan(0)
  })

  it('should display activity timestamps', async () => {
    render(<ActivityFeed />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Timestamps are formatted as 'MMM dd, HH:mm' (e.g., "Mar 14, 10:30")
    // Since MSW mock data uses Date.now()-relative timestamps, match any date format
    const timestamps = screen.getAllByText(/[A-Z][a-z]{2} \d{2}, \d{2}:\d{2}/)
    expect(timestamps.length).toBeGreaterThan(0)
  })
})
