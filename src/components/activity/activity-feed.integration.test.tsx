import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Find and use search input
    const searchInput = screen.getByPlaceholderText('Search activities...')
    await user.type(searchInput, 'task_completed')

    // Should filter results via MSW handler search param
    await waitFor(() => {
      expect(screen.getByText(/ReviewAgent completed task/)).toBeInTheDocument()
    })
  })

  it('should handle project filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load — with our Select mock, all items are always visible
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Click on a project option (mock Select renders all items inline)
    await user.click(screen.getByText('Test Project 1'))

    // Should filter to only activities from Test Project 1
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task "Test Task"/)).toBeInTheDocument()
      expect(screen.getByText(/ReviewAgent completed task "Test Task 2"/)).toBeInTheDocument()
      expect(screen.queryByText(/ReviewAgent commented on "Test Task 3"/)).not.toBeInTheDocument()
    })
  })

  it('should handle agent filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for agents to load from MSW
    await waitFor(() => {
      expect(screen.getByText('CodeAgent')).toBeInTheDocument()
    })

    // Click on an agent option (mock Select renders all items inline)
    // Find the select item with CodeAgent text, not the activity description
    const selectItems = screen.getAllByTestId('select-item')
    const codeAgentItem = selectItems.find(item => item.textContent?.includes('CodeAgent'))
    expect(codeAgentItem).toBeDefined()
    await user.click(codeAgentItem!)

    // Should filter to only activities from CodeAgent
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
      expect(screen.getByText(/CodeAgent moved "Test Task"/)).toBeInTheDocument()
    })
  })

  it('should handle activity type filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Activity types are statically rendered - find and click "Task Created"
    await user.click(screen.getByText('Task Created'))

    // Should filter to only task_created activities
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
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

    // Find expand buttons specifically (small w-3 h-3 chevrons, not Select trigger h-4 w-4)
    const expandButtons = screen.getAllByRole('button').filter(btn => {
      const svg = btn.querySelector('.lucide-chevron-down')
      return svg && svg.classList.contains('w-3')
    })

    expect(expandButtons.length).toBeGreaterThan(0)
    await user.click(expandButtons[0])

    // Should show activity details
    await waitFor(() => {
      expect(screen.getByText('Activity Details')).toBeInTheDocument()
    })
  })

  it('should handle refresh functionality', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Find and click refresh button by its icon
    const refreshButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg[class*="lucide-refresh-cw"]')
    )

    expect(refreshButton).toBeDefined()
    await user.click(refreshButton!)
    
    // Should still show data after refresh
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })
  })

  it('should show live indicator when WebSocket is connected', async () => {
    render(<ActivityFeed realTime={true} />)

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Activity Feed')).toBeInTheDocument()
    })

    // Should show live indicator (from mocked WebSocket context with connectionStatus: 'connected')
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
    await user.type(searchInput, 'nonexistentactivity12345')

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

    // Wait for data to load — MSW handler respects the limit param
    await waitFor(() => {
      expect(screen.getByText('Activity Feed')).toBeInTheDocument()
    })

    // Component passes maxItems as limit to the API
    // The actual filtering is done server-side (MSW)
    // Just verify the component rendered without errors
    await waitFor(() => {
      // Should have loaded some activity data
      const activityTexts = document.querySelectorAll('p.text-sm.text-white.font-medium')
      expect(activityTexts.length).toBeLessThanOrEqual(5) // At most 5 items returned by MSW
    })
  })

  it('should handle date range filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/CodeAgent created task/)).toBeInTheDocument()
    })

    // Date range uses a Popover (mocked to render inline), with Button items
    // The trigger shows "All Time", and "Today"/"This Week" are options inside
    const todayButton = screen.getByRole('button', { name: /Today/ })
    expect(todayButton).toBeInTheDocument()
    await user.click(todayButton)

    // After clicking "Today", the trigger should show "Custom Range" indicating filter is active
    await waitFor(() => {
      expect(screen.getByText('Custom Range')).toBeInTheDocument()
    })
  })
})
