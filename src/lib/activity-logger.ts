import { db } from './db'
import { activity, projects, tasks, agents } from './schema'
import { websocketManager } from './websocket-manager'
import { eq } from 'drizzle-orm'

export interface ActivityLogData {
  projectId?: number
  taskId?: number
  agentId?: number
  action: string
  details?: Record<string, unknown>
}

export class ActivityLogger {
  /**
   * Validate relationship IDs exist in database
   */
  private static async validateRelationships(data: ActivityLogData): Promise<void> {
    const errors: string[] = []

    // Validate project exists
    if (data.projectId) {
      const project = await db.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, data.projectId))
        .limit(1)
      
      if (project.length === 0) {
        errors.push(`Project with ID ${data.projectId} does not exist`)
      }
    }

    // Validate task exists
    if (data.taskId) {
      const task = await db.select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.id, data.taskId))
        .limit(1)
      
      if (task.length === 0) {
        errors.push(`Task with ID ${data.taskId} does not exist`)
      }
    }

    // Validate agent exists
    if (data.agentId) {
      const agent = await db.select({ id: agents.id })
        .from(agents)
        .where(eq(agents.id, data.agentId))
        .limit(1)
      
      if (agent.length === 0) {
        errors.push(`Agent with ID ${data.agentId} does not exist`)
      }
    }

    if (errors.length > 0) {
      throw new Error(`Activity validation failed: ${errors.join(', ')}`)
    }
  }

  /**
   * Log a single activity entry
   */
  static async log(data: ActivityLogData, broadcast: boolean = true): Promise<void> {
    try {
      // Validate relationships exist
      await this.validateRelationships(data)

      const [newActivity] = await db.insert(activity).values({
        projectId: data.projectId,
        taskId: data.taskId,
        agentId: data.agentId,
        action: data.action,
        details: data.details || {},
      }).returning()

      // Broadcast the activity via WebSocket if enabled
      if (broadcast && websocketManager.isReady()) {
        this.broadcastActivity({
          id: newActivity.id,
          projectId: newActivity.projectId,
          taskId: newActivity.taskId,
          agentId: newActivity.agentId,
          action: newActivity.action,
          details: newActivity.details || {},
          timestamp: newActivity.timestamp.toISOString(),
        })
      }
    } catch (error) {
      console.error('Failed to log activity:', error)
      // Don't throw - activity logging shouldn't break main functionality
    }
  }

  /**
   * Broadcast activity to WebSocket clients
   */
  private static broadcastActivity(activityData: {
    id: number
    projectId?: number | null
    taskId?: number | null
    agentId?: number | null
    action: string
    details: Record<string, unknown>
    timestamp: string
  }): void {
    try {
      const io = websocketManager.getIO() as any
      if (io && typeof io.emit === 'function') {
        // Broadcast to all connected clients
        io.emit('activity', activityData)
      }
    } catch (error) {
      console.error('Failed to broadcast activity:', error)
    }
  }

  /**
   * Log multiple activity entries in a batch
   */
  static async logBatch(entries: ActivityLogData[], broadcast: boolean = true): Promise<void> {
    if (entries.length === 0) return

    try {
      // Validate all relationships exist
      for (const entry of entries) {
        await this.validateRelationships(entry)
      }

      const newActivities = await db.insert(activity).values(
        entries.map(entry => ({
          projectId: entry.projectId,
          taskId: entry.taskId,
          agentId: entry.agentId,
          action: entry.action,
          details: entry.details || {},
        }))
      ).returning()

      // Broadcast activities if enabled
      if (broadcast && websocketManager.isReady() && newActivities.length > 0) {
        const io = websocketManager.getIO()
        if (io) {
          newActivities.forEach(activity => {
            this.broadcastActivity({
              id: activity.id,
              projectId: activity.projectId,
              taskId: activity.taskId,
              agentId: activity.agentId,
              action: activity.action,
              details: activity.details || {},
              timestamp: activity.timestamp.toISOString(),
            })
          })
        }
      }
    } catch (error) {
      console.error('Failed to log activity batch:', error)
      // Don't throw - activity logging shouldn't break main functionality
    }
  }

  /**
   * Task-specific activity logging helpers
   */
  static async logTaskCreated(taskId: number, projectId: number, agentId?: number, details?: Record<string, unknown>, broadcast: boolean = true): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'task_created',
      details,
    }, broadcast)
  }

  static async logTaskUpdated(taskId: number, projectId: number, agentId?: number, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'task_updated',
      details,
    })
  }

  static async logTaskMoved(
    taskId: number, 
    projectId: number, 
    fromStatus: string, 
    toStatus: string, 
    agentId?: number,
    details?: Record<string, unknown>,
    broadcast: boolean = true
  ): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'task_moved',
      details: {
        fromStatus,
        toStatus,
        ...details,
      },
    }, broadcast)
  }

  static async logTaskAssigned(
    taskId: number, 
    projectId: number, 
    assignedTo: string,
    agentId?: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'task_assigned',
      details: {
        assignedTo,
        ...details,
      },
    })
  }

  static async logTaskCompleted(taskId: number, projectId: number, agentId?: number, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'task_completed',
      details,
    })
  }

  static async logTaskDeleted(taskId: number, projectId: number, agentId?: number, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'task_deleted',
      details,
    })
  }

  /**
   * Comment-specific activity logging helpers
   */
  static async logCommentAdded(
    taskId: number, 
    projectId: number, 
    commentId: number,
    agentId?: number,
    details?: Record<string, unknown>,
    broadcast: boolean = true
  ): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'comment_added',
      details: {
        commentId,
        ...details,
      },
    }, broadcast)
  }

  static async logCommentUpdated(
    taskId: number, 
    projectId: number, 
    commentId: number,
    agentId?: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'comment_updated',
      details: {
        commentId,
        ...details,
      },
    })
  }

  static async logCommentDeleted(
    taskId: number, 
    projectId: number, 
    commentId: number,
    agentId?: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      taskId,
      projectId,
      agentId,
      action: 'comment_deleted',
      details: {
        commentId,
        ...details,
      },
    })
  }

  /**
   * Project-specific activity logging helpers
   */
  static async logProjectCreated(projectId: number, agentId?: number, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      projectId,
      agentId,
      action: 'project_created',
      details,
    })
  }

  static async logProjectUpdated(projectId: number, agentId?: number, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      projectId,
      agentId,
      action: 'project_updated',
      details,
    })
  }

  static async logProjectDeleted(projectId: number, agentId?: number, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      projectId,
      agentId,
      action: 'project_deleted',
      details,
    })
  }

  static async logProjectStatusChanged(
    projectId: number, 
    fromStatus: string, 
    toStatus: string,
    agentId?: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      projectId,
      agentId,
      action: 'project_status_changed',
      details: {
        fromStatus,
        toStatus,
        ...details,
      },
    })
  }

  /**
   * Agent-specific activity logging helpers
   */
  static async logAgentJoined(agentId: number, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      agentId,
      action: 'agent_joined',
      details,
    })
  }

  static async logAgentStatusChanged(
    agentId: number, 
    fromStatus: string, 
    toStatus: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      agentId,
      action: 'agent_status_changed',
      details: {
        fromStatus,
        toStatus,
        ...details,
      },
    })
  }

  static async logAgentAssignmentChanged(
    agentId: number,
    taskId?: number,
    projectId?: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      agentId,
      taskId,
      projectId,
      action: 'agent_assignment_changed',
      details,
    })
  }

  /**
   * Generic system activity logging helpers
   */
  static async logSystemEvent(action: string, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      action: `system_${action}`,
      details,
    })
  }

  /**
   * Bulk operation logging with aggregation
   */
  static async logBulkOperation(
    operation: string,
    count: number,
    targetType: 'tasks' | 'projects' | 'comments',
    projectId?: number,
    agentId?: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      projectId,
      agentId,
      action: `bulk_${operation}`,
      details: {
        operation,
        count,
        targetType,
        ...details,
      },
    })
  }
}