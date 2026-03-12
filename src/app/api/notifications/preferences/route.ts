import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notificationPreferences, agents } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { NotificationType } from '@/types'

// Default notification preferences
const DEFAULT_PREFERENCES: Array<{
  notificationType: NotificationType
  enabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
}> = [
  { notificationType: 'task_assigned', enabled: true, emailEnabled: false, pushEnabled: true },
  { notificationType: 'task_reassigned', enabled: true, emailEnabled: false, pushEnabled: true },
  { notificationType: 'task_status_changed', enabled: true, emailEnabled: false, pushEnabled: true },
  { notificationType: 'task_priority_changed', enabled: true, emailEnabled: false, pushEnabled: false },
  { notificationType: 'comment_added', enabled: true, emailEnabled: false, pushEnabled: true },
  { notificationType: 'comment_mention', enabled: true, emailEnabled: true, pushEnabled: true },
  { notificationType: 'comment_reply', enabled: true, emailEnabled: true, pushEnabled: true },
  { notificationType: 'project_task_added', enabled: true, emailEnabled: false, pushEnabled: false },
  { notificationType: 'project_updated', enabled: true, emailEnabled: false, pushEnabled: false },
  { notificationType: 'system_announcement', enabled: true, emailEnabled: true, pushEnabled: true },
]

/**
 * GET /api/notifications/preferences - Get user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      )
    }

    const agentIdNum = parseInt(agentId)

    // Check if agent exists
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentIdNum))
      .limit(1)

    if (agent.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Get existing preferences
    const existingPreferences = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.agentId, agentIdNum))

    // Create a map of existing preferences
    const existingMap = new Map(
      existingPreferences.map(p => [p.notificationType, p])
    )

    // Merge with defaults for missing preferences
    const allPreferences = DEFAULT_PREFERENCES.map(defaultPref => {
      const existing = existingMap.get(defaultPref.notificationType)
      if (existing) {
        return existing
      } else {
        return {
          id: 0, // Will be set when created
          agentId: agentIdNum,
          ...defaultPref,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
    })

    return NextResponse.json({
      preferences: allPreferences,
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/preferences - Update user's notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, preferences } = body

    if (!agentId || !Array.isArray(preferences)) {
      return NextResponse.json(
        { error: 'agentId and preferences array are required' },
        { status: 400 }
      )
    }

    // Check if agent exists
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1)

    if (agent.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    const updatedPreferences = []

    // Process each preference
    for (const pref of preferences) {
      const { notificationType, enabled, emailEnabled, pushEnabled } = pref

      if (!notificationType) {
        continue // Skip invalid entries
      }

      // Check if preference already exists
      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.agentId, agentId),
            eq(notificationPreferences.notificationType, notificationType)
          )
        )
        .limit(1)

      if (existing.length > 0) {
        // Update existing preference
        const updated = await db
          .update(notificationPreferences)
          .set({
            enabled: enabled ?? existing[0].enabled,
            emailEnabled: emailEnabled ?? existing[0].emailEnabled,
            pushEnabled: pushEnabled ?? existing[0].pushEnabled,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.id, existing[0].id))
          .returning()

        updatedPreferences.push(updated[0])
      } else {
        // Create new preference
        const created = await db
          .insert(notificationPreferences)
          .values({
            agentId,
            notificationType,
            enabled: enabled ?? true,
            emailEnabled: emailEnabled ?? false,
            pushEnabled: pushEnabled ?? true,
          })
          .returning()

        updatedPreferences.push(created[0])
      }
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}