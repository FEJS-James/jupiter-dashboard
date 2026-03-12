/**
 * @vitest-environment node
 */

import { ActivityLogger } from './activity-logger'
import { db } from './db'
import { websocketManager } from './websocket-manager'
import { projects, tasks, agents, activity } from './schema'
import { vi } from 'vitest'

// Mock database
vi.mock('./db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

// Mock websocket manager
vi.mock('./websocket-manager', () => ({
  websocketManager: {
    isReady: vi.fn(() => true),
    getIO: vi.fn(() => ({
      emit: vi.fn(),
    })),
  },
}))

const mockDb = db as any
const mockWebsocketManager = websocketManager as any

describe('ActivityLogger', () => {
  const mockInsertResult = {
    id: 1,
    projectId: 1,
    taskId: 1,
    agentId: 1,
    action: 'task_created',
    details: { priority: 'high' },
    timestamp: new Date('2026-03-12T10:00:00Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock successful relationship validation
    const mockValidationQueryBuilder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue([{ id: 1 }]), // Entity exists
    }

    // Mock successful insert
    const mockInsertBuilder = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnValue([mockInsertResult]),
    }

    mockDb.select.mockReturnValue(mockValidationQueryBuilder as any)
    mockDb.insert.mockReturnValue(mockInsertBuilder as any)

    // Mock websocket
    mockWebsocketManager.isReady.mockReturnValue(true)
    mockWebsocketManager.getIO.mockReturnValue({
      emit: vi.fn(),
    } as any)
  })

  describe('log()', () => {
    it('should log activity with all fields', async () => {
      const activityData = {
        projectId: 1,
        taskId: 1,
        agentId: 1,
        action: 'task_created',
        details: { priority: 'high', assignee: 'John' },
      }

      await ActivityLogger.log(activityData)

      expect(mockDb.select).toHaveBeenCalledTimes(3) // Validate project, task, agent
      expect(mockDb.insert).toHaveBeenCalledWith(activity)
      
      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        projectId: 1,
        taskId: 1,
        agentId: 1,
        action: 'task_created',
        details: { priority: 'high', assignee: 'John' },
      })
    })

    it('should log activity with minimal fields', async () => {
      const activityData = {
        action: 'system_event',
      }

      await ActivityLogger.log(activityData)

      expect(mockDb.insert).toHaveBeenCalledWith(activity)
      
      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        projectId: undefined,
        taskId: undefined,
        agentId: undefined,
        action: 'system_event',
        details: {},
      })
    })

    it('should broadcast activity when websocket is ready', async () => {
      const mockIO = { emit: vi.fn() }
      mockWebsocketManager.getIO.mockReturnValue(mockIO as any)

      const activityData = {
        action: 'task_created',
        projectId: 1,
      }

      await ActivityLogger.log(activityData)

      expect(mockIO.emit).toHaveBeenCalledWith('activity', {
        id: 1,
        projectId: 1,
        taskId: 1,
        agentId: 1,
        action: 'task_created',
        details: { priority: 'high' },
        timestamp: '2026-03-12T10:00:00.000Z',
      })
    })

    it('should not broadcast when websocket is not ready', async () => {
      mockWebsocketManager.isReady.mockReturnValue(false)

      const activityData = {
        action: 'task_created',
        projectId: 1,
      }

      await ActivityLogger.log(activityData, true)

      expect(mockWebsocketManager.getIO).not.toHaveBeenCalled()
    })

    it('should not broadcast when broadcast flag is false', async () => {
      const activityData = {
        action: 'task_created',
        projectId: 1,
      }

      await ActivityLogger.log(activityData, false)

      expect(mockWebsocketManager.getIO).not.toHaveBeenCalled()
    })

    it('should handle validation errors gracefully', async () => {
      // Mock validation failure
      const mockFailedValidationBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue([]), // Entity doesn't exist
      }
      
      mockDb.select.mockReturnValue(mockFailedValidationBuilder as any)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const activityData = {
        projectId: 999, // Non-existent project
        action: 'task_created',
      }

      // Should not throw
      await expect(ActivityLogger.log(activityData)).resolves.not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log activity:', 
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockErrorBuilder = {
        values: vi.fn().mockImplementation(() => {
          throw new Error('Database connection failed')
        }),
      }
      
      mockDb.insert.mockReturnValue(mockErrorBuilder as any)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const activityData = {
        action: 'task_created',
      }

      // Should not throw
      await expect(ActivityLogger.log(activityData)).resolves.not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log activity:', 
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('logBatch()', () => {
    it('should log multiple activities', async () => {
      const activities = [
        { action: 'task_created', projectId: 1 },
        { action: 'task_updated', taskId: 1 },
        { action: 'comment_added', taskId: 1, agentId: 1 },
      ]

      // Mock batch insert result
      const mockBatchResult = activities.map((act, i) => ({
        ...mockInsertResult,
        id: i + 1,
        action: act.action,
      }))

      const mockBatchInsertBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnValue(mockBatchResult),
      }

      mockDb.insert.mockReturnValue(mockBatchInsertBuilder as any)

      await ActivityLogger.logBatch(activities)

      expect(mockBatchInsertBuilder.values).toHaveBeenCalledWith([
        { projectId: 1, taskId: undefined, agentId: undefined, action: 'task_created', details: {} },
        { projectId: undefined, taskId: 1, agentId: undefined, action: 'task_updated', details: {} },
        { projectId: undefined, taskId: 1, agentId: 1, action: 'comment_added', details: {} },
      ])
    })

    it('should handle empty batch', async () => {
      await ActivityLogger.logBatch([])

      expect(mockDb.insert).not.toHaveBeenCalled()
    })

    it('should broadcast all batch activities', async () => {
      const mockIO = { emit: vi.fn() }
      mockWebsocketManager.getIO.mockReturnValue(mockIO as any)

      const activities = [
        { action: 'task_created', projectId: 1 },
        { action: 'task_updated', taskId: 1 },
      ]

      const mockBatchResult = [
        { ...mockInsertResult, id: 1, action: 'task_created' },
        { ...mockInsertResult, id: 2, action: 'task_updated' },
      ]

      const mockBatchInsertBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnValue(mockBatchResult),
      }

      mockDb.insert.mockReturnValue(mockBatchInsertBuilder as any)

      await ActivityLogger.logBatch(activities)

      expect(mockIO.emit).toHaveBeenCalledTimes(2)
      expect(mockIO.emit).toHaveBeenNthCalledWith(1, 'activity', expect.objectContaining({
        id: 1,
        action: 'task_created',
      }))
      expect(mockIO.emit).toHaveBeenNthCalledWith(2, 'activity', expect.objectContaining({
        id: 2,
        action: 'task_updated',
      }))
    })
  })

  describe('Task-specific logging helpers', () => {
    it('should log task creation', async () => {
      await ActivityLogger.logTaskCreated(1, 1, 1, { priority: 'high' })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'task_created',
        details: { priority: 'high' },
      })
    })

    it('should log task update', async () => {
      await ActivityLogger.logTaskUpdated(1, 1, 1, { field: 'title', oldValue: 'Old', newValue: 'New' })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'task_updated',
        details: { field: 'title', oldValue: 'Old', newValue: 'New' },
      })
    })

    it('should log task moved with status change', async () => {
      await ActivityLogger.logTaskMoved(1, 1, 'backlog', 'in-progress', 1)

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'task_moved',
        details: {
          fromStatus: 'backlog',
          toStatus: 'in-progress',
        },
      })
    })

    it('should log task assignment', async () => {
      await ActivityLogger.logTaskAssigned(1, 1, 'John Doe', 1)

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'task_assigned',
        details: {
          assignedTo: 'John Doe',
        },
      })
    })

    it('should log task completion', async () => {
      await ActivityLogger.logTaskCompleted(1, 1, 1)

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'task_completed',
        details: undefined,
      })
    })

    it('should log task deletion', async () => {
      await ActivityLogger.logTaskDeleted(1, 1, 1, { reason: 'duplicate' })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'task_deleted',
        details: { reason: 'duplicate' },
      })
    })
  })

  describe('Comment-specific logging helpers', () => {
    it('should log comment added', async () => {
      await ActivityLogger.logCommentAdded(1, 1, 123, 1)

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'comment_added',
        details: {
          commentId: 123,
        },
      })
    })

    it('should log comment updated', async () => {
      await ActivityLogger.logCommentUpdated(1, 1, 123, 1, { edited: true })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'comment_updated',
        details: {
          commentId: 123,
          edited: true,
        },
      })
    })

    it('should log comment deleted', async () => {
      await ActivityLogger.logCommentDeleted(1, 1, 123, 1)

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        taskId: 1,
        projectId: 1,
        agentId: 1,
        action: 'comment_deleted',
        details: {
          commentId: 123,
        },
      })
    })
  })

  describe('Project-specific logging helpers', () => {
    it('should log project creation', async () => {
      await ActivityLogger.logProjectCreated(1, 1, { description: 'New project' })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        projectId: 1,
        agentId: 1,
        action: 'project_created',
        details: { description: 'New project' },
      })
    })

    it('should log project status change', async () => {
      await ActivityLogger.logProjectStatusChanged(1, 'active', 'completed', 1)

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        projectId: 1,
        agentId: 1,
        action: 'project_status_changed',
        details: {
          fromStatus: 'active',
          toStatus: 'completed',
        },
      })
    })
  })

  describe('Agent-specific logging helpers', () => {
    it('should log agent joined', async () => {
      await ActivityLogger.logAgentJoined(1, { role: 'developer' })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        agentId: 1,
        action: 'agent_joined',
        details: { role: 'developer' },
      })
    })

    it('should log agent status change', async () => {
      await ActivityLogger.logAgentStatusChanged(1, 'inactive', 'active')

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        agentId: 1,
        action: 'agent_status_changed',
        details: {
          fromStatus: 'inactive',
          toStatus: 'active',
        },
      })
    })

    it('should log agent assignment change', async () => {
      await ActivityLogger.logAgentAssignmentChanged(1, 2, 1, { reason: 'workload balancing' })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        agentId: 1,
        taskId: 2,
        projectId: 1,
        action: 'agent_assignment_changed',
        details: { reason: 'workload balancing' },
      })
    })
  })

  describe('System and bulk operation helpers', () => {
    it('should log system events', async () => {
      await ActivityLogger.logSystemEvent('backup_completed', { duration: '5 minutes' })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        action: 'system_backup_completed',
        details: { duration: '5 minutes' },
      })
    })

    it('should log bulk operations', async () => {
      await ActivityLogger.logBulkOperation('delete', 15, 'tasks', 1, 1, { cascade: true })

      const insertBuilder = mockDb.insert.mock.results[0].value
      expect(insertBuilder.values).toHaveBeenCalledWith({
        projectId: 1,
        agentId: 1,
        action: 'bulk_delete',
        details: {
          operation: 'delete',
          count: 15,
          targetType: 'tasks',
          cascade: true,
        },
      })
    })
  })
})