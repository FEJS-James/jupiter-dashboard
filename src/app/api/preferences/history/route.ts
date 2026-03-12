import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { preferenceHistory, userPreferences, agents } from '@/lib/schema'
import { eq, desc, sql } from 'drizzle-orm'

// GET /api/preferences/history - Get preference change history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }
    
    // Get user preferences to find the preference record
    const userPrefs = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.agentId, parseInt(agentId)))
      .limit(1)
    
    if (userPrefs.length === 0) {
      return NextResponse.json({ error: 'User preferences not found' }, { status: 404 })
    }
    
    // Get preference history
    const history = await db
      .select()
      .from(preferenceHistory)
      .where(eq(preferenceHistory.userPreferenceId, userPrefs[0].id))
      .orderBy(desc(preferenceHistory.changedAt))
      .limit(limit)
      .offset(offset)
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(preferenceHistory)
      .where(eq(preferenceHistory.userPreferenceId, userPrefs[0].id))
    
    const count = countResult[0]?.count || 0
    
    return NextResponse.json({
      history,
      pagination: {
        limit,
        offset,
        total: count as number,
        hasMore: offset + limit < (count as number),
      },
    })
    
  } catch (error) {
    console.error('Error fetching preference history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preference history' },
      { status: 500 }
    )
  }
}