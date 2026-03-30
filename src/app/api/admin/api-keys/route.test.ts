// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockDb, mockFrom, mockValues, mockReturning } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockValues = vi.fn();
  const mockReturning = vi.fn();
  const mockDb = {
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    insert: vi.fn().mockReturnValue({ values: mockValues }),
  };
  mockValues.mockReturnValue({ returning: mockReturning });
  return { mockDb, mockFrom, mockValues, mockReturning };
});

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { mockRequireRole, mockGenerateApiKey, MockAuthError } = vi.hoisted(() => {
  const mockRequireRole = vi.fn();
  const mockGenerateApiKey = vi.fn().mockReturnValue({
    plaintext: 'jd_test1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    hash: 'abc123hash',
    prefix: 'jd_test1',
  });
  class MockAuthError extends Error {
    status: number;
    constructor(msg: string, status: number) { super(msg); this.status = status; this.name = 'AuthError'; }
  }
  return { mockRequireRole, mockGenerateApiKey, MockAuthError };
});

vi.mock('@/lib/api-auth', () => ({
  requireRole: mockRequireRole,
  generateApiKey: mockGenerateApiKey,
  AuthError: MockAuthError,
}));

import { POST, GET } from './route';

function makeRequest(method: string, body?: Record<string, unknown>) {
  const opts: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-key' },
  };
  if (body) opts.body = JSON.stringify(body);
  return new NextRequest('http://localhost/api/admin/api-keys', opts);
}

describe('POST /api/admin/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({ from: mockFrom });
    mockDb.insert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockRequireRole.mockResolvedValue({ valid: true, role: 'admin', keyId: 1, name: 'admin' });
  });

  it('returns 403 when not admin', async () => {
    mockRequireRole.mockRejectedValue(new MockAuthError('Forbidden', 403));
    const res = await POST(makeRequest('POST', { name: 'test', role: 'coder' }));
    expect(res.status).toBe(403);
  });

  it('returns 401 when API key is deactivated', async () => {
    mockRequireRole.mockRejectedValue(new MockAuthError('Invalid or inactive API key', 401));
    const res = await POST(makeRequest('POST', { name: 'test', role: 'coder' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Invalid or inactive API key');
  });

  it('returns 400 for missing name', async () => {
    const res = await POST(makeRequest('POST', { role: 'coder' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const res = await POST(makeRequest('POST', { name: 'test', role: 'hacker' }));
    expect(res.status).toBe(400);
  });

  it('creates key and returns plaintext', async () => {
    mockReturning.mockResolvedValueOnce([{ id: 10, name: 'my-coder', role: 'coder', keyPrefix: 'jd_test1' }]);

    const res = await POST(makeRequest('POST', { name: 'my-coder', role: 'coder' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.key).toMatch(/^jd_/);
    expect(json.data.prefix).toBe('jd_test1');
  });
});

describe('GET /api/admin/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({ from: mockFrom });
    mockRequireRole.mockResolvedValue({ valid: true, role: 'admin', keyId: 1, name: 'admin' });
  });

  it('returns list of keys without full key', async () => {
    const rows = [{ id: 1, keyPrefix: 'jd_abc1', name: 'coder-key', role: 'coder', isActive: true, lastUsedAt: null, createdAt: '2026-01-01' }];
    mockFrom.mockResolvedValueOnce(rows);

    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].keyPrefix).toBe('jd_abc1');
  });
});
