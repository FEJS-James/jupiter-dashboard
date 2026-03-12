import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

// User session schema
const UserSessionSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    role: z.string().optional(),
  }),
  iat: z.number().optional(),
  exp: z.number().optional(),
})

export type UserSession = z.infer<typeof UserSessionSchema>

/**
 * Extract and verify JWT token from request headers
 */
export function getSessionFromRequest(request: NextRequest): { session: UserSession; error: null } | { session: null; error: string } {
  try {
    // Try Authorization header first
    const authHeader = request.headers.get('Authorization')
    let token: string | null = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      // Try cookie as fallback
      const cookieToken = request.cookies.get('auth-token')?.value
      if (cookieToken) {
        token = cookieToken
      }
    }

    if (!token) {
      return { session: null, error: 'No authentication token provided' }
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Validate the payload structure
    const validation = UserSessionSchema.safeParse(decoded)
    if (!validation.success) {
      return { session: null, error: 'Invalid token payload structure' }
    }

    return { session: validation.data, error: null }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { session: null, error: `Token validation failed: ${error.message}` }
    }
    return { session: null, error: 'Authentication error' }
  }
}

/**
 * Middleware-like function for API routes requiring authentication
 */
export function requireAuth(request: NextRequest): { session: UserSession; error: null } | { session: null; error: NextResponse } {
  const { session, error } = getSessionFromRequest(request)
  
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { error: 'Unauthorized', details: error },
        { status: 401 }
      )
    }
  }

  return { session, error: null }
}

/**
 * Validate that the requesting user can access resources for the given user ID
 */
export function validateUserAccess(session: UserSession, requestedUserId: number): boolean {
  return session.user.id === requestedUserId
}

/**
 * Create a development JWT token for testing (remove in production)
 */
export function createDevToken(user: { id: number; name: string; email: string; role?: string }): string {
  const payload = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
    }
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * Return standardized unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Return standardized forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}