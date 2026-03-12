import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifications, agents, tasks, projects, comments } from '@/lib/schema'
import { eq, desc, and, isNull, or, sql, count } from 'drizzle-orm'
import { NotificationType, NotificationPriority } from '@/types'
import { requireAuth, validateUserAccess, forbiddenResponse } from '@/lib/auth'
import { z } from 'zod'

// Input validation schemas
const CreateNotificationSchema = z.object({
  recipientId: z.number().positive(),
  type: z.string().min(1),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  entityType: z.string().optional(),
  entityId: z.number().positive().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.number().positive().optional(),
  actionUrl: z.string().url().optional().or(z.literal('')),
  metadata: z.record(z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  expiresAt: z.string().datetime().optional(),
})

/**
 * GET /api/notifications - Get user's notifications with pagination and filters
 */
export async function GET(request: NextRequest) {
  // Require authentication
  const { session, error } = requireAuth(request)
  if (error) return error

  try {
    const searchParams = request.nextUrl.searchParams
    const recipientId = searchParams.get('recipientId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type') as NotificationType | null
    const priority = searchParams.get('priority') as NotificationPriority | null

    // Validate recipientId is provided and matches authenticated user
    if (!recipientId) {
      return NextResponse.json(
        { error: 'recipientId is required' },
        { status: 400 }
      )
    }

    const requestedUserId = parseInt(recipientId)
    if (isNaN(requestedUserId)) {
      return NextResponse.json(
        { error: 'Invalid recipientId format' },
        { status: 400 }
      )
    }

    // Ensure user can only access their own notifications
    if (!validateUserAccess(session, requestedUserId)) {
      return forbiddenResponse('You can only access your own notifications')
    }

    const offset = (page - 1) * limit

    // Build where conditions
    let whereConditions = [eq(notifications.recipientId, requestedUserId)]
    
    if (unreadOnly) {
      whereConditions.push(eq(notifications.isRead, false))
    }
    
    if (type) {
      whereConditions.push(eq(notifications.type, type))
    }
    
    if (priority) {
      whereConditions.push(eq(notifications.priority, priority))
    }

    // Add expiration filter - don't show expired notifications
    whereConditions.push(
      or(
        isNull(notifications.expiresAt),
        sql`${notifications.expiresAt} > unixepoch()`
      )
    )

    // Get notifications with relations
    const notificationsList = await db
      .select({
        notification: notifications,
        recipient: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
          avatarUrl: agents.avatarUrl,
        },
        task: {
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
        },
        project: {
          id: projects.id,
          name: projects.name,
          status: projects.status,
        },
        comment: {
          id: comments.id,
          content: comments.content,
          taskId: comments.taskId,
        },
      })
      .from(notifications)
      .leftJoin(agents, eq(notifications.recipientId, agents.id))
      .leftJoin(tasks, and(
        eq(notifications.entityType, 'task'),
        eq(notifications.entityId, tasks.id)
      ))
      .leftJoin(projects, and(
        eq(notifications.entityType, 'project'),
        eq(notifications.entityId, projects.id)
      ))
      .leftJoin(comments, and(
        eq(notifications.entityType, 'comment'),
        eq(notifications.entityId, comments.id)
      ))
      .where(and(...whereConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(...whereConditions))

    const totalCount = totalCountResult[0]?.count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      notifications: notificationsList.map(item => ({
        ...item.notification,
        recipient: item.recipient,
        task: item.task,
        project: item.project,
        comment: item.comment,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications - Create a new notification
 */
export async function POST(request: NextRequest) {
  // Require authentication
  const { session, error } = requireAuth(request)
  if (error) return error

  try {
    const body = await request.json()
    
    // Validate and sanitize input
    const validation = CreateNotificationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: validation.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const {
      recipientId,
      type,
      title,
      message,
      entityType,
      entityId,
      relatedEntityType,
      relatedEntityId,
      actionUrl,
      metadata,
      priority,
      expiresAt,
    } = validation.data

    // Validate recipient exists
    const recipient = await db
      .select()
      .from(agents)
      .where(eq(agents.id, recipientId))
      .limit(1)

    if (recipient.length === 0) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Validate that user can create notifications for this recipient
    // For security, users should only create notifications for themselves or through authorized system processes
    if (!validateUserAccess(session, recipientId)) {
      return forbiddenResponse('You can only create notifications for yourself')
    }

    // Validate entityId exists if provided
    if (entityType && entityId) {
      let entityExists = false
      
      switch (entityType) {
        case 'task':
          const task = await db.select().from(tasks).where(eq(tasks.id, entityId)).limit(1)
          entityExists = task.length > 0
          break
        case 'project':
          const project = await db.select().from(projects).where(eq(projects.id, entityId)).limit(1)
          entityExists = project.length > 0
          break
        case 'comment':
          const comment = await db.select().from(comments).where(eq(comments.id, entityId)).limit(1)
          entityExists = comment.length > 0
          break
        default:
          // Unknown entity type - allow but log
          console.warn(`Unknown entity type: ${entityType}`)
          entityExists = true
      }

      if (!entityExists) {
        return NextResponse.json(
          { error: `Referenced ${entityType} does not exist` },
          { status: 400 }
        )
      }
    }

    // Sanitize content to prevent XSS
    const sanitizedTitle = title.replace(/<[^>]*>/g, '').trim()
    const sanitizedMessage = message.replace(/<[^>]*>/g, '').trim()

    // Create notification
    const newNotification = await db
      .insert(notifications)
      .values({
        recipientId,
        type,
        title: sanitizedTitle,
        message: sanitizedMessage,
        entityType,
        entityId,
        relatedEntityType,
        relatedEntityId,
        actionUrl,
        metadata,
        priority,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      .returning()

    // Fetch the created notification with relations
    const createdNotification = await db
      .select({
        notification: notifications,
        recipient: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
          avatarUrl: agents.avatarUrl,
        },
      })
      .from(notifications)
      .leftJoin(agents, eq(notifications.recipientId, agents.id))
      .where(eq(notifications.id, newNotification[0].id))
      .limit(1)

    return NextResponse.json({
      ...createdNotification[0].notification,
      recipient: createdNotification[0].recipient,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}