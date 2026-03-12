import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'

// For now, we'll store export configurations in memory/localStorage
// In a production environment, you'd want to store these in the database
// with user associations

const exportConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['task-export', 'report']),
  config: z.object({
    format: z.enum(['csv', 'json']).optional(),
    fields: z.array(z.string()).optional(),
    filters: z.object({
      project: z.coerce.number().optional(),
      status: z.array(z.string()).optional(),
      priority: z.array(z.string()).optional(),
      assignedAgent: z.string().optional(),
      tags: z.array(z.string()).optional(),
      dateRange: z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
        preset: z.string().optional(),
      }).optional(),
    }).optional(),
    reportConfig: z.object({
      reportType: z.enum(['overview', 'project-health', 'agent-performance', 'velocity', 'custom']).optional(),
      sections: z.array(z.string()).optional(),
      includeCharts: z.boolean().optional(),
    }).optional(),
    csvOptions: z.object({
      delimiter: z.enum(['comma', 'semicolon', 'tab']).optional(),
      encoding: z.enum(['utf-8', 'windows-1252']).optional(),
      dateFormat: z.enum(['iso', 'us', 'eu']).optional(),
    }).optional(),
  }),
  isDefault: z.boolean().default(false),
  lastUsed: z.string().datetime().optional(),
})

// In-memory storage for demo purposes
// In production, this would be stored in a database table
let exportConfigurations: Array<z.infer<typeof exportConfigSchema> & { id: string; userId: string }> = []

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    // For demo purposes, we'll use a simple user identifier
    // In production, this would come from the session
    const userId = 'demo-user'

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'task-export' | 'report' | null
    const configId = searchParams.get('id')

    if (configId) {
      // Get specific configuration
      const config = exportConfigurations.find(c => c.id === configId && c.userId === userId)
      if (!config) {
        return NextResponse.json({
          success: false,
          error: 'Configuration not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: config
      })
    } else {
      // Get all configurations for user, optionally filtered by type
      let userConfigs = exportConfigurations.filter(c => c.userId === userId)
      
      if (type) {
        userConfigs = userConfigs.filter(c => c.type === type)
      }

      // Sort by lastUsed descending, then by name
      userConfigs.sort((a, b) => {
        if (a.lastUsed && b.lastUsed) {
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
        }
        if (a.lastUsed && !b.lastUsed) return -1
        if (!a.lastUsed && b.lastUsed) return 1
        return a.name.localeCompare(b.name)
      })

      return NextResponse.json({
        success: true,
        data: userConfigs
      })
    }

  } catch (error) {
    console.error('Export config GET error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    const userId = 'demo-user'
    const body = await request.json()
    
    // Parse and validate request body
    const parsed = exportConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const configData = parsed.data
    const configId = configData.id || `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newConfig = {
      ...configData,
      id: configId,
      userId,
      lastUsed: new Date().toISOString()
    }

    // Check if configuration already exists (update vs create)
    const existingIndex = exportConfigurations.findIndex(c => c.id === configId && c.userId === userId)
    
    if (existingIndex >= 0) {
      // Update existing configuration
      exportConfigurations[existingIndex] = newConfig
    } else {
      // Create new configuration
      exportConfigurations.push(newConfig)
    }

    // If this is set as default, remove default from other configs of same type
    if (newConfig.isDefault) {
      exportConfigurations.forEach(c => {
        if (c.userId === userId && c.type === newConfig.type && c.id !== configId) {
          c.isDefault = false
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: newConfig
    })

  } catch (error) {
    console.error('Export config POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    const userId = 'demo-user'
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('id')

    if (!configId) {
      return NextResponse.json({
        success: false,
        error: 'Configuration ID is required'
      }, { status: 400 })
    }

    // Find existing configuration
    const existingIndex = exportConfigurations.findIndex(c => c.id === configId && c.userId === userId)
    
    if (existingIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 })
    }

    // Parse and validate request body
    const parsed = exportConfigSchema.safeParse({ ...body, id: configId })

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const configData = parsed.data
    const updatedConfig = {
      ...configData,
      id: configId,
      userId,
      lastUsed: new Date().toISOString()
    }

    // Update the configuration
    exportConfigurations[existingIndex] = updatedConfig

    // If this is set as default, remove default from other configs of same type
    if (updatedConfig.isDefault) {
      exportConfigurations.forEach(c => {
        if (c.userId === userId && c.type === updatedConfig.type && c.id !== configId) {
          c.isDefault = false
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedConfig
    })

  } catch (error) {
    console.error('Export config PUT error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    const userId = 'demo-user'
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('id')

    if (!configId) {
      return NextResponse.json({
        success: false,
        error: 'Configuration ID is required'
      }, { status: 400 })
    }

    // Find and remove configuration
    const existingIndex = exportConfigurations.findIndex(c => c.id === configId && c.userId === userId)
    
    if (existingIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 })
    }

    const deletedConfig = exportConfigurations.splice(existingIndex, 1)[0]

    return NextResponse.json({
      success: true,
      data: {
        id: deletedConfig.id,
        name: deletedConfig.name
      }
    })

  } catch (error) {
    console.error('Export config DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Endpoint to update last used timestamp
export async function PATCH(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    const userId = 'demo-user'
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('id')
    const action = searchParams.get('action')

    if (!configId) {
      return NextResponse.json({
        success: false,
        error: 'Configuration ID is required'
      }, { status: 400 })
    }

    const config = exportConfigurations.find(c => c.id === configId && c.userId === userId)
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 })
    }

    if (action === 'use') {
      // Update last used timestamp
      config.lastUsed = new Date().toISOString()
    } else if (action === 'set-default') {
      // Set as default and remove default from others
      exportConfigurations.forEach(c => {
        if (c.userId === userId && c.type === config.type) {
          c.isDefault = c.id === configId
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: config
    })

  } catch (error) {
    console.error('Export config PATCH error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}