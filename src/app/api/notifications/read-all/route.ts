import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifications } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

/**
 * PUT /api/notifications/read-all - Mark all notifications as read for a specific user
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipientId } = body

    if (!recipientId) {
      return NextResponse.json(
        { error: 'recipientId is required' },
        { status: 400 }
      )
    }

    // Mark all unread notifications as read
    const result = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false)
        )
      )
      .returning()

    return NextResponse.json({
      success: true,
      updatedCount: result.length,
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}