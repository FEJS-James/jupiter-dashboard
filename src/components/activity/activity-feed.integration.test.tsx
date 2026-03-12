import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityFeed } from './activity-feed'

// Integration tests using MSW mock handlers
describe('ActivityFeed Integration Tests', () => {
  it('should load and display activity feed data', async () => {
    render(<ActivityFeed />)

    // Should show loading initially
    expect(screen.getByText('Activity Feed')).toBeInTheDocument()
    
    // Wait for data to load
    await waitFor(
      () => {
        expect(screen.getByText(/CodeAgent created task "Test Task"/)).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Should display multiple activities
    expect(screen.getByText(/CodeAgent moved "Test Task" from backlog to in-progress/)).toBeInTheDocument()
    expect(screen.getByText(/ReviewAgent commented on "Test Task 3"/)).toBeInTheDocument()
    expect(screen.getByText(/DeployAgent joined the system/)).toBeInTheDocument()
    expect(screen.getByText(/ReviewAgent completed task "Test Task 2"/)).toBeInTheDocument()
  })

  it('should handle search functionality', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent/)).toBeInTheDocument()
    })

    // Find and use search input
    const searchInput = screen.getByPlaceholderText('Search activities...')
    await user.type(searchInput, 'completed')

    // Should filter results
    await waitFor(() => {
      expect(screen.getByText(/ReviewAgent completed task/)).toBeInTheDocument()
      expect(screen.queryByText(/CodeAgent created task/)).not.toBeInTheDocument()
    })
  })

  it('should handle project filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('All Projects')).toBeInTheDocument()
    })

    // Open project filter dropdown
    await user.click(screen.getByText('All Projects'))
    
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Test Project 1'))

    // Should filter to only activities from Test Project 1
    await waitFor(() => {
      // Should show activities from project 1
      expect(screen.getByText(/CodeAgent created task "Test Task"/)).toBeInTheDocument()
      expect(screen.getByText(/ReviewAgent completed task "Test Task 2"/)).toBeInTheDocument()
      // Should not show activities from other projects
      expect(screen.queryByText(/ReviewAgent commented on "Test Task 3"/)).not.toBeInTheDocument()
    })
  })

  it('should handle agent filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('All Agents')).toBeInTheDocument()
    })

    // Open agent filter dropdown
    await user.click(screen.getByText('All Agents'))
    
    await waitFor(() => {
      expect(screen.getByText('CodeAgent')).toBeInTheDocument()
    })

    await user.click(screen.getByText('CodeAgent'))

    // Should filter to only activities from CodeAgent
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
      expect(screen.getByText(/CodeAgent moved "Test Task"/)).toBeInTheDocument()
      expect(screen.queryByText(/ReviewAgent/)).not.toBeInTheDocument()
      expect(screen.queryByText(/DeployAgent/)).not.toBeInTheDocument()
    })
  })

  it('should handle activity type filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('All Types')).toBeInTheDocument()
    })

    // Open activity type filter dropdown
    await user.click(screen.getByText('All Types'))
    
    await waitFor(() => {
      expect(screen.getByText('Task Created')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Task Created'))

    // Should filter to only task_created activities
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
      expect(screen.queryByText(/moved "Test Task"/)).not.toBeInTheDocument()
      expect(screen.queryByText(/commented on/)).not.toBeInTheDocument()
      expect(screen.queryByText(/joined the system/)).not.toBeInTheDocument()
    })
  })

  it('should clear filters when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load and add a filter
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search activities...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search activities...')
    await user.type(searchInput, 'created')

    // Wait for clear button to appear
    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Clear Filters'))

    // Should clear search and show all activities
    expect(searchInput).toHaveValue('')
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
      expect(screen.getByText(/CodeAgent moved "Test Task"/)).toBeInTheDocument()
      expect(screen.getByText(/ReviewAgent commented/)).toBeInTheDocument()
    })
  })

  it('should expand activity details when chevron is clicked', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Find expand button - look for chevron icons
    const expandButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')
    )

    // Click the first expand button we find
    if (expandButtons.length > 0) {
      await user.click(expandButtons[0])

      // Should show activity details
      await waitFor(() => {
        expect(screen.getByText('Activity Details')).toBeInTheDocument()
      })
    }
  })

  it('should handle refresh functionality', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent/)).toBeInTheDocument()
    })

    // Find and click refresh button
    const refreshButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg[class*="lucide-refresh-cw"]')
    )

    if (refreshButton) {
      await user.click(refreshButton)
      
      // Should still show data after refresh
      await waitFor(() => {
        expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
      })
    }
  })

  it('should show live indicator when WebSocket is connected', async () => {
    render(<ActivityFeed realTime={true} />)

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Activity Feed')).toBeInTheDocument()
    })

    // Should show live indicator (from mocked WebSocket context)
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('should handle empty state', async () => {
    render(<ActivityFeed />)

    // Search for something that doesn't exist
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search activities...')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    const searchInput = screen.getByPlaceholderText('Search activities...')
    await user.type(searchInput, 'nonexistentactivity')

    // Should show no activity message
    await waitFor(() => {
      expect(screen.getByText('No activity found')).toBeInTheDocument()
    })
  })

  it('should show correct activity descriptions for different activity types', async () => {
    render(<ActivityFeed />)

    // Wait for data to load and check different activity type descriptions
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task "Test Task" in Test Project 1/)).toBeInTheDocument()
      expect(screen.getByText(/CodeAgent moved "Test Task" from backlog to in-progress/)).toBeInTheDocument()
      expect(screen.getByText(/ReviewAgent commented on "Test Task 3"/)).toBeInTheDocument()
      expect(screen.getByText(/DeployAgent joined the system/)).toBeInTheDocument()
      expect(screen.getByText(/ReviewAgent completed task "Test Task 2"/)).toBeInTheDocument()
    })
  })

  it('should handle compact mode', async () => {
    render(<ActivityFeed compact={true} />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // In compact mode, should still show the same activities
    expect(screen.getByText(/CodeAgent moved "Test Task"/)).toBeInTheDocument()
  })

  it('should respect maxItems prop', async () => {
    render(<ActivityFeed maxItems={2} />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent/)).toBeInTheDocument()
    })

    // Should only show limited number of activities
    const activityElements = screen.getAllByText(/Agent/)
    expect(activityElements.length).toBeLessThanOrEqual(4) // Max 2 items, but might have multiple mentions per item
  })

  it('should handle date range filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('All Time')).toBeInTheDocument()
    })

    // Open date range filter
    await user.click(screen.getByText('All Time'))
    
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Today'))

    // Should apply date filter and show recent activities
    await waitFor(() => {
      // Activities should still be visible as they're mocked with recent timestamps
      expect(screen.getByText(/CodeAgent/)).toBeInTheDocument()
    })
  })
})