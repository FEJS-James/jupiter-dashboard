import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock the database and utilities
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([]))
            }))
          }))
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => Promise.resolve([]))
          }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1, name: 'Test Agent' }]))
      }))
    }))
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  like: vi.fn(),
  or: vi.fn(),
  and: vi.fn(),
  count: vi.fn()
}));

vi.mock('@/lib/schema', () => ({
  agents: {
    id: 'id',
    name: 'name',
    role: 'role',
    color: 'color',
    avatarUrl: 'avatarUrl',
    status: 'status',
    currentTaskId: 'currentTaskId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  tasks: {
    assignedAgent: 'assignedAgent',
    status: 'status'
  }
}));

vi.mock('@/lib/validation', () => ({
  createAgentSchema: {
    parse: vi.fn(() => ({ name: 'Test Agent', role: 'coder' }))
  },
  agentFiltersSchema: {
    parse: vi.fn(() => ({ role: null, status: null, search: null }))
  }
}));

vi.mock('@/lib/api-utils', () => ({
  createSuccessResponse: vi.fn((data) => 
    new Response(JSON.stringify({ success: true, data }), { status: 200 })
  ),
  createErrorResponse: vi.fn((message, status) => 
    new Response(JSON.stringify({ error: message }), { status })
  ),
  handleDatabaseError: vi.fn(() => 
    new Response(JSON.stringify({ error: 'Database error' }), { status: 500 })
  ),
  handleZodError: vi.fn(() => 
    new Response(JSON.stringify({ error: 'Validation error' }), { status: 400 })
  ),
  parseRequestBody: vi.fn(() => Promise.resolve({ name: 'Test Agent', role: 'coder' }))
}));

describe('/api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should handle requests without filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents');
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle requests with role filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents?role=coder');
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle requests with multiple filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents?role=coder&status=available&search=test');
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('POST', () => {
    it('should create a new agent successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Agent', role: 'coder' })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle validation errors', async () => {
      const { handleZodError } = await import('@/lib/api-utils');
      const { createAgentSchema } = await import('@/lib/validation');
      
      vi.mocked(createAgentSchema.parse).mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });
      
      const request = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500); // handleDatabaseError fallback
    });
  });
});