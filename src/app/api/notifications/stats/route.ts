import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifications } from '@/lib/schema'
import { eq, count, and, sql, or, isNull } from 'drizzle-orm'

/**
 * GET /api/notifications/stats - Get notification statistics for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const recipientId = searchParams.get('recipientId')

    if (!recipientId) {
      return NextResponse.json(
        { error: 'recipientId is required' },
        { status: 400 }
      )
    }

    const recipientIdNum = parseInt(recipientId)

    // Base condition - only non-expired notifications for this user
    const baseConditions = [
      eq(notifications.recipientId, recipientIdNum),
      or(
        isNull(notifications.expiresAt),
        sql`${notifications.expiresAt} > unixepoch()`
      )
    ]

    // Get unread count
    const unreadCount = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          ...baseConditions,
          eq(notifications.isRead, false)
        )
      )

    // Get total count
    const totalCount = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(...baseConditions))

    // Get counts by type
    const byTypeResult = await db
      .select({
        type: notifications.type,
        count: count(),
      })
      .from(notifications)
      .where(
        and(
          ...baseConditions,
          eq(notifications.isRead, false)
        )
      )
      .groupBy(notifications.type)

    // Get counts by priority
    const byPriorityResult = await db
      .select({
        priority: notifications.priority,
        count: count(),
      })
      .from(notifications)
      .where(
        and(
          ...baseConditions,
          eq(notifications.isRead, false)
        )
      )
      .groupBy(notifications.priority)

    // Format results
    const byType: Record<string, number> = {}
    byTypeResult.forEach(item => {
      byType[item.type] = item.count
    })

    const byPriority: Record<string, number> = {}
    byPriorityResult.forEach(item => {
      byPriority[item.priority] = item.count
    })

    return NextResponse.json({
      unreadCount: unreadCount[0]?.count || 0,
      totalCount: totalCount[0]?.count || 0,
      byType,
      byPriority,
    })
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification statistics' },
      { status: 500 }
    )
  }
}