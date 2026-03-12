import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifications, agents } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/notifications/[id] - Get a specific notification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = parseInt(params.id)

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      )
    }

    const notification = await db
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
      .where(eq(notifications.id, notificationId))
      .limit(1)

    if (notification.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...notification[0].notification,
      recipient: notification[0].recipient,
    })
  } catch (error) {
    console.error('Error fetching notification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/[id] - Update a notification (mainly for read status)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = parseInt(params.id)
    const body = await request.json()
    const { isRead } = body

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      )
    }

    // Check if notification exists
    const existingNotification = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1)

    if (existingNotification.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Update notification
    const updateData: any = {}
    
    if (typeof isRead === 'boolean') {
      updateData.isRead = isRead
      updateData.readAt = isRead ? new Date() : null
    }

    const updatedNotification = await db
      .update(notifications)
      .set(updateData)
      .where(eq(notifications.id, notificationId))
      .returning()

    return NextResponse.json(updatedNotification[0])
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/[id] - Delete a specific notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = parseInt(params.id)

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      )
    }

    // Check if notification exists
    const existingNotification = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1)

    if (existingNotification.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Delete notification
    await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}