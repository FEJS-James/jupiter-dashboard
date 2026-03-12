import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifications, agents, tasks, projects, comments } from '@/lib/schema'
import { eq, desc, and, isNull, or, sql, count } from 'drizzle-orm'
import { NotificationType, NotificationPriority } from '@/types'

/**
 * GET /api/notifications - Get user's notifications with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const recipientId = searchParams.get('recipientId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type') as NotificationType | null
    const priority = searchParams.get('priority') as NotificationPriority | null

    if (!recipientId) {
      return NextResponse.json(
        { error: 'recipientId is required' },
        { status: 400 }
      )
    }

    const offset = (page - 1) * limit

    // Build where conditions
    let whereConditions = [eq(notifications.recipientId, parseInt(recipientId))]
    
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
  try {
    const body = await request.json()
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
      priority = 'normal',
      expiresAt,
    } = body

    // Validate required fields
    if (!recipientId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'recipientId, type, title, and message are required' },
        { status: 400 }
      )
    }

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

    // Create notification
    const newNotification = await db
      .insert(notifications)
      .values({
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