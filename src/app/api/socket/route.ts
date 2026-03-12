import { NextRequest, NextResponse } from 'next/server'

// This API route is used for Socket.IO initialization
// The actual Socket.IO server is initialized via custom server or pages API
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Socket.IO server endpoint',
    path: '/api/socket',
    transports: ['websocket', 'polling']
  })
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Socket.IO server endpoint - POST not supported',
    error: 'Use WebSocket connection'
  }, { status: 405 })
}