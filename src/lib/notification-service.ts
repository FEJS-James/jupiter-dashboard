import { db } from '@/lib/db'
import { notifications, notificationPreferences, agents, tasks, projects, comments } from '@/lib/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { NotificationType, NotificationPriority, Agent, Task, Project, TaskComment } from '@/types'

interface NotificationData {
  recipientId: number
  type: NotificationType
  title: string
  message: string
  entityType?: 'task' | 'project' | 'comment' | 'system'
  entityId?: number
  relatedEntityType?: 'task' | 'project' | 'comment' | 'agent'
  relatedEntityId?: number
  actionUrl?: string
  metadata?: Record<string, unknown>
  priority?: NotificationPriority
  expiresAt?: Date
}

export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(data: NotificationData): Promise<void> {
    try {
      // Check if recipient has this notification type enabled
      const preference = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.agentId, data.recipientId),
            eq(notificationPreferences.notificationType, data.type)
          )
        )
        .limit(1)

      // If preference exists and is disabled, don't create notification
      if (preference.length > 0 && !preference[0].enabled) {
        return
      }

      // Create the notification
      await db.insert(notifications).values({
        recipientId: data.recipientId,
        type: data.type,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        priority: data.priority || 'normal',
        expiresAt: data.expiresAt,
      })
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  /**
   * Create notifications for multiple recipients
   */
  static async createNotifications(
    recipientIds: number[],
    baseData: Omit<NotificationData, 'recipientId'>
  ): Promise<void> {
    if (recipientIds.length === 0) return

    try {
      // Get preferences for all recipients
      const preferences = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            inArray(notificationPreferences.agentId, recipientIds),
            eq(notificationPreferences.notificationType, baseData.type)
          )
        )

      // Create a set of recipients who have disabled this notification type
      const disabledRecipients = new Set(
        preferences.filter(p => !p.enabled).map(p => p.agentId)
      )

      // Filter recipients who should receive the notification
      const enabledRecipients = recipientIds.filter(id => !disabledRecipients.has(id))

      if (enabledRecipients.length === 0) return

      // Create notifications for enabled recipients
      const notificationData = enabledRecipients.map(recipientId => ({
        recipientId,
        type: baseData.type,
        title: baseData.title,
        message: baseData.message,
        entityType: baseData.entityType,
        entityId: baseData.entityId,
        relatedEntityType: baseData.relatedEntityType,
        relatedEntityId: baseData.relatedEntityId,
        actionUrl: baseData.actionUrl,
        metadata: baseData.metadata,
        priority: baseData.priority || 'normal',
        expiresAt: baseData.expiresAt,
      }))

      await db.insert(notifications).values(notificationData)
    } catch (error) {
      console.error('Error creating notifications:', error)
    }
  }

  /**
   * Task Assignment Notification
   */
  static async notifyTaskAssigned(task: Task, assignedAgentId: number, assignedBy?: Agent): Promise<void> {
    const assignedByName = assignedBy?.name || 'System'
    
    await this.createNotification({
      recipientId: assignedAgentId,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned to task "${task.title}" by ${assignedByName}`,
      entityType: 'task',
      entityId: task.id,
      relatedEntityType: 'agent',
      relatedEntityId: assignedBy?.id,
      actionUrl: `/tasks/${task.id}`,
      priority: task.priority === 'urgent' ? 'urgent' : task.priority === 'high' ? 'high' : 'normal',
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        taskPriority: task.priority,
        assignedBy: assignedByName,
        projectId: task.projectId,
      },
    })
  }

  /**
   * Task Reassignment Notification
   */
  static async notifyTaskReassigned(
    task: Task,
    newAgentId: number,
    previousAgentId?: number,
    reassignedBy?: Agent
  ): Promise<void> {
    const reassignedByName = reassignedBy?.name || 'System'
    
    // Notify new assignee
    await this.createNotification({
      recipientId: newAgentId,
      type: 'task_reassigned',
      title: 'Task Reassigned to You',
      message: `Task "${task.title}" has been reassigned to you by ${reassignedByName}`,
      entityType: 'task',
      entityId: task.id,
      relatedEntityType: 'agent',
      relatedEntityId: reassignedBy?.id,
      actionUrl: `/tasks/${task.id}`,
      priority: task.priority === 'urgent' ? 'urgent' : 'normal',
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        reassignedBy: reassignedByName,
        projectId: task.projectId,
      },
    })

    // Notify previous assignee if exists
    if (previousAgentId && previousAgentId !== newAgentId) {
      await this.createNotification({
        recipientId: previousAgentId,
        type: 'task_reassigned',
        title: 'Task Reassigned',
        message: `Task "${task.title}" has been reassigned from you by ${reassignedByName}`,
        entityType: 'task',
        entityId: task.id,
        relatedEntityType: 'agent',
        relatedEntityId: reassignedBy?.id,
        actionUrl: `/tasks/${task.id}`,
        priority: 'normal',
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          reassignedBy: reassignedByName,
          projectId: task.projectId,
          wasReassignedFrom: true,
        },
      })
    }
  }

  /**
   * Task Status Change Notification
   */
  static async notifyTaskStatusChanged(
    task: Task,
    fromStatus: string,
    toStatus: string,
    changedBy?: Agent
  ): Promise<void> {
    const changedByName = changedBy?.name || 'System'
    
    // Get all interested parties
    const interestedAgents: number[] = []
    
    // Add task assignee
    if (task.assignedAgent) {
      const assignee = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.name, task.assignedAgent))
        .limit(1)
      
      if (assignee.length > 0) {
        interestedAgents.push(assignee[0].id)
      }
    }

    // Get commenters on this task
    const commenters = await db
      .select({ agentId: comments.agentId })
      .from(comments)
      .where(eq(comments.taskId, task.id))
    
    commenters.forEach(commenter => {
      if (!interestedAgents.includes(commenter.agentId)) {
        interestedAgents.push(commenter.agentId)
      }
    })

    // Remove the person who made the change
    const filteredAgents = interestedAgents.filter(id => id !== changedBy?.id)

    if (filteredAgents.length === 0) return

    // Determine priority and message based on status
    let priority: NotificationPriority = 'normal'
    let title = 'Task Status Updated'
    
    if (toStatus === 'done') {
      title = 'Task Completed'
      priority = 'normal'
    } else if (toStatus === 'blocked') {
      title = 'Task Blocked'
      priority = 'high'
    } else if (toStatus === 'code-review' || toStatus === 'testing') {
      priority = 'normal'
    }

    await this.createNotifications(filteredAgents, {
      type: 'task_status_changed',
      title,
      message: `Task "${task.title}" status changed from ${fromStatus} to ${toStatus} by ${changedByName}`,
      entityType: 'task',
      entityId: task.id,
      relatedEntityType: 'agent',
      relatedEntityId: changedBy?.id,
      actionUrl: `/tasks/${task.id}`,
      priority,
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        fromStatus,
        toStatus,
        changedBy: changedByName,
        projectId: task.projectId,
      },
    })
  }

  /**
   * Task Priority Change Notification
   */
  static async notifyTaskPriorityChanged(
    task: Task,
    fromPriority: string,
    toPriority: string,
    changedBy?: Agent
  ): Promise<void> {
    const changedByName = changedBy?.name || 'System'
    
    // Only notify for high/urgent priority changes
    if (toPriority !== 'high' && toPriority !== 'urgent') return

    // Get task assignee
    if (!task.assignedAgent) return

    const assignee = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.name, task.assignedAgent))
      .limit(1)
    
    if (assignee.length === 0) return

    // Don't notify if the assignee made the change
    if (changedBy?.id === assignee[0].id) return

    await this.createNotification({
      recipientId: assignee[0].id,
      type: 'task_priority_changed',
      title: 'Task Priority Updated',
      message: `Task "${task.title}" priority changed from ${fromPriority} to ${toPriority} by ${changedByName}`,
      entityType: 'task',
      entityId: task.id,
      relatedEntityType: 'agent',
      relatedEntityId: changedBy?.id,
      actionUrl: `/tasks/${task.id}`,
      priority: toPriority === 'urgent' ? 'urgent' : 'high',
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        fromPriority,
        toPriority,
        changedBy: changedByName,
        projectId: task.projectId,
      },
    })
  }

  /**
   * Comment Notification
   */
  static async notifyCommentAdded(
    comment: TaskComment,
    task: Task,
    commenter: Agent
  ): Promise<void> {
    const interestedAgents: number[] = []
    
    // Add task assignee
    if (task.assignedAgent) {
      const assignee = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.name, task.assignedAgent))
        .limit(1)
      
      if (assignee.length > 0 && assignee[0].id !== commenter.id) {
        interestedAgents.push(assignee[0].id)
      }
    }

    // Get other commenters (excluding the current commenter)
    const otherCommenters = await db
      .select({ agentId: comments.agentId })
      .from(comments)
      .where(
        and(
          eq(comments.taskId, task.id),
          // ne(comments.agentId, commenter.id) // Exclude current commenter
        )
      )
    
    otherCommenters.forEach(c => {
      if (c.agentId !== commenter.id && !interestedAgents.includes(c.agentId)) {
        interestedAgents.push(c.agentId)
      }
    })

    if (interestedAgents.length === 0) return

    await this.createNotifications(interestedAgents, {
      type: 'comment_added',
      title: 'New Comment',
      message: `${commenter.name} commented on task "${task.title}": ${comment.content.slice(0, 100)}${comment.content.length > 100 ? '...' : ''}`,
      entityType: 'comment',
      entityId: comment.id,
      relatedEntityType: 'task',
      relatedEntityId: task.id,
      actionUrl: `/tasks/${task.id}#comment-${comment.id}`,
      priority: 'normal',
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        commentId: comment.id,
        commenterName: commenter.name,
        commentPreview: comment.content.slice(0, 200),
        projectId: task.projectId,
      },
    })
  }

  /**
   * Project Task Added Notification
   */
  static async notifyProjectTaskAdded(
    task: Task,
    project: Project,
    createdBy?: Agent
  ): Promise<void> {
    const createdByName = createdBy?.name || 'System'

    // Get all agents who have been assigned tasks in this project
    const projectAgents = await db
      .select({ agentId: agents.id })
      .from(tasks)
      .innerJoin(agents, eq(tasks.assignedAgent, agents.name))
      .where(eq(tasks.projectId, project.id))

    const recipientIds = projectAgents
      .map(a => a.agentId)
      .filter(id => id !== createdBy?.id)
      .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates

    if (recipientIds.length === 0) return

    await this.createNotifications(recipientIds, {
      type: 'project_task_added',
      title: 'New Task in Project',
      message: `New task "${task.title}" was added to project "${project.name}" by ${createdByName}`,
      entityType: 'task',
      entityId: task.id,
      relatedEntityType: 'project',
      relatedEntityId: project.id,
      actionUrl: `/tasks/${task.id}`,
      priority: 'normal',
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        projectId: project.id,
        projectName: project.name,
        createdBy: createdByName,
      },
    })
  }

  /**
   * System Announcement
   */
  static async notifySystemAnnouncement(
    title: string,
    message: string,
    recipientIds?: number[],
    priority: NotificationPriority = 'normal',
    actionUrl?: string,
    expiresAt?: Date
  ): Promise<void> {
    let recipients = recipientIds

    // If no specific recipients, send to all active agents
    if (!recipients) {
      const allAgents = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.status, 'available'))
      
      recipients = allAgents.map(a => a.id)
    }

    if (recipients.length === 0) return

    await this.createNotifications(recipients, {
      type: 'system_announcement',
      title,
      message,
      entityType: 'system',
      actionUrl,
      priority,
      expiresAt,
      metadata: {
        isSystemMessage: true,
        timestamp: new Date().toISOString(),
      },
    })
  }
}