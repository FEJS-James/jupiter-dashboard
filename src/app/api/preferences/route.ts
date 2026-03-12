import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userPreferences, agents, projects, preferenceHistory } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'
import { DEFAULT_USER_PREFERENCES, type PreferenceFormData, type PreferenceBatchUpdateRequest } from '@/types'

// GET /api/preferences - Get user preferences for current agent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }
    
    // Check if agent exists
    const agent = await db.select().from(agents).where(eq(agents.id, parseInt(agentId))).limit(1)
    if (agent.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Get user preferences
    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.agentId, parseInt(agentId)))
      .limit(1)
    
    if (preferences.length === 0) {
      // Create default preferences for new user
      const defaultPrefs = {
        agentId: parseInt(agentId),
        ...DEFAULT_USER_PREFERENCES,
      } as any
      
      const [newPrefs] = await db
        .insert(userPreferences)
        .values(defaultPrefs)
        .returning()
      
      return NextResponse.json(newPrefs)
    }
    
    // Get related data
    const [prefsWithRelations] = await db
      .select({
        preferences: userPreferences,
        agent: agents,
        defaultProject: projects,
      })
      .from(userPreferences)
      .leftJoin(agents, eq(userPreferences.agentId, agents.id))
      .leftJoin(projects, eq(userPreferences.defaultProjectId, projects.id))
      .where(eq(userPreferences.id, preferences[0].id))
      .limit(1)
    
    return NextResponse.json({
      ...prefsWithRelations.preferences,
      agent: prefsWithRelations.agent,
      defaultProject: prefsWithRelations.defaultProject,
    })
    
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// PUT /api/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, ...updateData } = body as PreferenceFormData & { agentId: number }
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }
    
    // Check if agent exists
    const agent = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1)
    if (agent.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Get existing preferences to track changes
    const existingPrefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.agentId, agentId))
      .limit(1)
    
    if (existingPrefs.length === 0) {
      // Create new preferences
      const [newPrefs] = await db
        .insert(userPreferences)
        .values({
          agentId,
          ...updateData,
        })
        .returning()
      
      return NextResponse.json(newPrefs)
    }
    
    // Track changes for history
    const changes: Array<{
      userPreferenceId: number
      fieldName: string
      previousValue?: string
      newValue?: string
    }> = []
    
    const existing = existingPrefs[0]
    
    // Compare and track changes
    Object.keys(updateData).forEach((key) => {
      const oldValue = (existing as any)[key]
      const newValue = (updateData as any)[key]
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          userPreferenceId: existing.id,
          fieldName: key,
          previousValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || ''),
          newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || ''),
        })
      }
    })
    
    // Update preferences
    const [updatedPrefs] = await db
      .update(userPreferences)
      .set(updateData)
      .where(eq(userPreferences.id, existing.id))
      .returning()
    
    // Save history if there are changes
    if (changes.length > 0) {
      await db.insert(preferenceHistory).values(changes)
    }
    
    // Return updated preferences with relations
    const [prefsWithRelations] = await db
      .select({
        preferences: userPreferences,
        agent: agents,
        defaultProject: projects,
      })
      .from(userPreferences)
      .leftJoin(agents, eq(userPreferences.agentId, agents.id))
      .leftJoin(projects, eq(userPreferences.defaultProjectId, projects.id))
      .where(eq(userPreferences.id, updatedPrefs.id))
      .limit(1)
    
    return NextResponse.json({
      ...prefsWithRelations.preferences,
      agent: prefsWithRelations.agent,
      defaultProject: prefsWithRelations.defaultProject,
    })
    
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

// PATCH /api/preferences - Batch update specific preferences
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as PreferenceBatchUpdateRequest & { agentId: number }
    const { agentId, updates } = body
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Updates array is required' }, { status: 400 })
    }
    
    // Get existing preferences
    const existingPrefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.agentId, agentId))
      .limit(1)
    
    if (existingPrefs.length === 0) {
      return NextResponse.json({ error: 'User preferences not found' }, { status: 404 })
    }
    
    const existing = existingPrefs[0]
    
    // Build update object
    const updateData: Record<string, unknown> = {}
    const changes: Array<{
      userPreferenceId: number
      fieldName: string
      previousValue?: string
      newValue?: string
    }> = []
    
    updates.forEach(({ field, value }) => {
      updateData[field] = value
      
      const oldValue = (existing as any)[field]
      if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        changes.push({
          userPreferenceId: existing.id,
          fieldName: field,
          previousValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || ''),
          newValue: typeof value === 'object' ? JSON.stringify(value) : String(value || ''),
        })
      }
    })
    
    // Update preferences
    const [updatedPrefs] = await db
      .update(userPreferences)
      .set(updateData)
      .where(eq(userPreferences.id, existing.id))
      .returning()
    
    // Save history
    if (changes.length > 0) {
      await db.insert(preferenceHistory).values(changes)
    }
    
    return NextResponse.json(updatedPrefs)
    
  } catch (error) {
    console.error('Error batch updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

// DELETE /api/preferences - Reset preferences to defaults
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }
    
    // Get existing preferences
    const existingPrefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.agentId, parseInt(agentId)))
      .limit(1)
    
    if (existingPrefs.length === 0) {
      return NextResponse.json({ error: 'User preferences not found' }, { status: 404 })
    }
    
    const existing = existingPrefs[0]
    
    // Reset to defaults - exclude readonly fields
    const defaultPrefsRaw = { ...DEFAULT_USER_PREFERENCES } as any
    delete defaultPrefsRaw.id
    delete defaultPrefsRaw.agentId
    delete defaultPrefsRaw.createdAt
    delete defaultPrefsRaw.updatedAt
    
    const [updatedPrefs] = await db
      .update(userPreferences)
      .set(defaultPrefsRaw)
      .where(eq(userPreferences.id, existing.id))
      .returning()
    
    // Record the reset in history
    await db.insert(preferenceHistory).values({
      userPreferenceId: existing.id,
      fieldName: '_reset_',
      previousValue: 'custom_settings',
      newValue: 'default_settings',
    })
    
    return NextResponse.json(updatedPrefs)
    
  } catch (error) {
    console.error('Error resetting preferences:', error)
    return NextResponse.json(
      { error: 'Failed to reset preferences' },
      { status: 500 }
    )
  }
}