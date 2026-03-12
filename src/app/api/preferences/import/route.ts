import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userPreferences, agents, preferenceHistory } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { DEFAULT_USER_PREFERENCES, type PreferenceFormData } from '@/types'

interface ImportData {
  meta?: {
    exportedAt?: string
    agentName?: string
    version?: number
  }
  preferences: Partial<PreferenceFormData>
}

// POST /api/preferences/import - Import user preferences
export async function POST(request: NextRequest) {
  try {
    const { agentId, importData, overwrite = false } = await request.json() as {
      agentId: number
      importData: ImportData
      overwrite?: boolean
    }
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }
    
    if (!importData || !importData.preferences) {
      return NextResponse.json({ error: 'Import data is required' }, { status: 400 })
    }
    
    // Validate agent exists
    const agent = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1)
    if (agent.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Get existing preferences
    const existingPrefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.agentId, agentId))
      .limit(1)
    
    // Validate and sanitize import data
    const sanitizedPrefs: any = {}
    const validFields = Object.keys(DEFAULT_USER_PREFERENCES)
    
    Object.keys(importData.preferences).forEach((key) => {
      if (validFields.includes(key)) {
        sanitizedPrefs[key] = (importData.preferences as any)[key]
      }
    })
    
    let updatedPrefs
    const changes: Array<{
      userPreferenceId: number
      fieldName: string
      previousValue?: string
      newValue?: string
    }> = []
    
    if (existingPrefs.length === 0) {
      // Create new preferences with imported data
      const [newPrefs] = await db
        .insert(userPreferences)
        .values({
          agentId,
          ...DEFAULT_USER_PREFERENCES,
          ...sanitizedPrefs,
        })
        .returning()
      
      // Record import in history
      await db.insert(preferenceHistory).values({
        userPreferenceId: newPrefs.id,
        fieldName: '_import_',
        previousValue: 'none',
        newValue: `imported_${importData.meta?.agentName || 'unknown'}`,
      })
      
      updatedPrefs = newPrefs
    } else {
      const existing = existingPrefs[0]
      
      let updateData: Record<string, unknown>
      
      if (overwrite) {
        // Complete overwrite with imported data
        updateData = {
          ...DEFAULT_USER_PREFERENCES,
          ...sanitizedPrefs,
        }
        
        // Track all changes
        Object.keys(updateData).forEach((key) => {
          const oldValue = (existing as any)[key]
          const newValue = updateData[key]
          
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              userPreferenceId: existing.id,
              fieldName: key,
              previousValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || ''),
              newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || ''),
            })
          }
        })
      } else {
        // Merge with existing preferences (imported values take precedence)
        updateData = sanitizedPrefs
        
        // Track only imported changes
        Object.keys(sanitizedPrefs).forEach((key) => {
          const oldValue = (existing as any)[key]
          const newValue = sanitizedPrefs[key]
          
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              userPreferenceId: existing.id,
              fieldName: key,
              previousValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || ''),
              newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || ''),
            })
          }
        })
      }
      
      // Update preferences
      const [updated] = await db
        .update(userPreferences)
        .set(updateData)
        .where(eq(userPreferences.id, existing.id))
        .returning()
      
      updatedPrefs = updated
      
      // Save history
      if (changes.length > 0) {
        await db.insert(preferenceHistory).values([
          ...changes,
          {
            userPreferenceId: existing.id,
            fieldName: '_import_',
            previousValue: overwrite ? 'overwrite' : 'merge',
            newValue: `imported_${importData.meta?.agentName || 'unknown'}`,
          },
        ])
      }
    }
    
    // Get updated preferences with relations
    const [prefsWithRelations] = await db
      .select({
        preferences: userPreferences,
        agent: agents,
      })
      .from(userPreferences)
      .leftJoin(agents, eq(userPreferences.agentId, agents.id))
      .where(eq(userPreferences.id, updatedPrefs.id))
      .limit(1)
    
    return NextResponse.json({
      ...prefsWithRelations.preferences,
      agent: prefsWithRelations.agent,
      importStats: {
        fieldsImported: Object.keys(sanitizedPrefs).length,
        changesApplied: changes.length,
        overwrite,
        importedFrom: importData.meta?.agentName,
        importedAt: new Date().toISOString(),
      },
    })
    
  } catch (error) {
    console.error('Error importing preferences:', error)
    return NextResponse.json(
      { error: 'Failed to import preferences' },
      { status: 500 }
    )
  }
}