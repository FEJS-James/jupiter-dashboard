import jwt from 'jsonwebtoken'
import { z } from 'zod'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

// User payload schema for JWT tokens
const UserTokenPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  iat: z.number().optional(),
  exp: z.number().optional()
})

export type UserTokenPayload = z.infer<typeof UserTokenPayloadSchema>

export class WebSocketAuth {
  // Generate a JWT token for a user (for development/testing)
  static generateToken(user: { id: string; name: string; email: string }): string {
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
  }

  // Verify and decode a JWT token
  static verifyToken(token: string): { success: true; user: UserTokenPayload } | { success: false; error: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      
      // Validate the payload structure
      const validation = UserTokenPayloadSchema.safeParse(decoded)
      if (!validation.success) {
        return { success: false, error: 'Invalid token payload structure' }
      }

      return { success: true, user: validation.data }
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return { success: false, error: `Token validation failed: ${error.message}` }
      }
      return { success: false, error: 'Unknown token validation error' }
    }
  }

  // Extract token from socket handshake
  static extractTokenFromSocket(socket: any): string | null {
    // Try to get token from auth header
    const authHeader = socket.handshake.auth?.token
    if (authHeader) {
      return authHeader
    }

    // Try to get token from query parameters
    const queryToken = socket.handshake.query?.token
    if (queryToken && typeof queryToken === 'string') {
      return queryToken
    }

    // Try to get token from cookies (if using cookie-based auth)
    const cookies = socket.handshake.headers.cookie
    if (cookies) {
      const tokenMatch = cookies.match(/(?:^|; )token=([^;]*)/)
      if (tokenMatch) {
        return decodeURIComponent(tokenMatch[1])
      }
    }

    return null
  }

  // Middleware for socket authentication
  static createAuthMiddleware() {
    return (socket: any, next: (err?: any) => void) => {
      const token = WebSocketAuth.extractTokenFromSocket(socket)
      
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const verification = WebSocketAuth.verifyToken(token)
      if (!verification.success) {
        return next(new Error(`Authentication failed: ${verification.error}`))
      }

      // Attach user info to socket
      socket.user = verification.user
      next()
    }
  }

  // Create a development token for testing (remove in production)
  static createDevToken(): string {
    const devUser = {
      id: 'dev-user-' + Date.now(),
      name: 'Development User',
      email: 'dev@example.com'
    }
    return WebSocketAuth.generateToken(devUser)
  }
}