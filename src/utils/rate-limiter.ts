// Rate limiter for WebSocket connections
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 60, windowMs: number = 60000) { // Default: 60 requests per minute
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  // Check if a client is rate limited
  isRateLimited(clientId: string): boolean {
    const now = Date.now()
    const clientRequests = this.requests.get(clientId) || []
    
    // Remove requests outside the time window
    const validRequests = clientRequests.filter(timestamp => now - timestamp < this.windowMs)
    
    // Check if client has exceeded the limit
    if (validRequests.length >= this.maxRequests) {
      return true
    }

    // Add current request and update the map
    validRequests.push(now)
    this.requests.set(clientId, validRequests)
    
    return false
  }

  // Get remaining requests for a client
  getRemainingRequests(clientId: string): number {
    const now = Date.now()
    const clientRequests = this.requests.get(clientId) || []
    const validRequests = clientRequests.filter(timestamp => now - timestamp < this.windowMs)
    
    return Math.max(0, this.maxRequests - validRequests.length)
  }

  // Clean up old entries (call this periodically)
  cleanup(): void {
    const now = Date.now()
    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs)
      if (validRequests.length === 0) {
        this.requests.delete(clientId)
      } else {
        this.requests.set(clientId, validRequests)
      }
    }
  }

  // Reset rate limit for a specific client
  reset(clientId: string): void {
    this.requests.delete(clientId)
  }

  // Get stats for monitoring
  getStats(): { totalClients: number; totalRequests: number } {
    const totalClients = this.requests.size
    const totalRequests = Array.from(this.requests.values())
      .reduce((sum, requests) => sum + requests.length, 0)
    
    return { totalClients, totalRequests }
  }
}