import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifications } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth, validateUserAccess, forbiddenResponse } from '@/lib/auth'
import { z } from 'zod'

// Request schema
const ReadAllSchema = z.object({
  recipientId: z.number().positive(),
})

/**
 * PUT /api/notifications/read-all - Mark all notifications as read for a specific user
 */
export async function PUT(request: NextRequest) {
  // Require authentication
  const { session, error } = requireAuth(request)
  if (error) return error

  try {
    const body = await request.json()
    
    // Validate input
    const validation = ReadAllSchema.safeParse(body)
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

    const { recipientId } = validation.data

    // Ensure user can only mark their own notifications as read
    if (!validateUserAccess(session, recipientId)) {
      return forbiddenResponse('You can only mark your own notifications as read')
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