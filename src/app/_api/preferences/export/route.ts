import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userPreferences, agents } from '@/lib/schema'
import { eq } from 'drizzle-orm'

// GET /api/preferences/export - Export user preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const format = searchParams.get('format') || 'json'
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }
    
    // Get user preferences with agent info
    const [prefsWithAgent] = await db
      .select({
        preferences: userPreferences,
        agent: agents,
      })
      .from(userPreferences)
      .leftJoin(agents, eq(userPreferences.agentId, agents.id))
      .where(eq(userPreferences.agentId, parseInt(agentId)))
      .limit(1)
    
    if (!prefsWithAgent) {
      return NextResponse.json({ error: 'User preferences not found' }, { status: 404 })
    }
    
    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        agentName: prefsWithAgent.agent?.name,
        version: prefsWithAgent.preferences.version,
      },
      preferences: {
        // Remove internal fields
        ...prefsWithAgent.preferences,
        id: undefined,
        agentId: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      },
    }
    
    // Clean up undefined values
    Object.keys(exportData.preferences).forEach(key => {
      if ((exportData.preferences as any)[key] === undefined) {
        delete (exportData.preferences as any)[key]
      }
    })
    
    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="preferences-${prefsWithAgent.agent?.name}-${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    }
    
    // For other formats, return JSON for now (can be extended)
    return NextResponse.json(exportData)
    
  } catch (error) {
    console.error('Error exporting preferences:', error)
    return NextResponse.json(
      { error: 'Failed to export preferences' },
      { status: 500 }
    )
  }
}