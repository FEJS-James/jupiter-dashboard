// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ─────────────────────────────────────────────────────
const { mockDb, mockFrom, mockWhere, mockLimit, mockSet, mockReturning, mockValues } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();
  const mockSet = vi.fn();
  const mockReturning = vi.fn();
  const mockValues = vi.fn();
  const mockDb = {
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    update: vi.fn().mockReturnValue({ set: mockSet }),
    insert: vi.fn().mockReturnValue({ values: mockValues }),
  };
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) });
  return { mockDb, mockFrom, mockWhere, mockLimit, mockSet, mockReturning, mockValues };
});

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { mockRequireRole, MockAuthError } = vi.hoisted(() => {
  const mockRequireRole = vi.fn();
  class MockAuthError extends Error {
    status: number;
    constructor(msg: string, status: number) { super(msg); this.status = status; this.name = 'AuthError'; }
  }
  return { mockRequireRole, MockAuthError };
});

vi.mock('@/lib/api-auth', () => ({
  requireRole: mockRequireRole,
  AuthError: MockAuthError,
}));

const { mockValidateTransition } = vi.hoisted(() => ({
  mockValidateTransition: vi.fn(),
}));

vi.mock('@/lib/state-machine', () => ({
  validateTransition: mockValidateTransition,
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>, token = 'test-key') {
  return new NextRequest('http://localhost/api/tasks/1/submit-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tasks/[id]/submit-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire chains after clearAllMocks
    mockDb.select.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockDb.update.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) });
    mockDb.insert.mockReturnValue({ values: mockValues });

    mockRequireRole.mockResolvedValue({ valid: true, role: 'coder', keyId: 1, name: 'coder-key' });
    mockValidateTransition.mockReturnValue({ valid: true });
  });

  it('returns 401 when auth fails', async () => {
    mockRequireRole.mockRejectedValue(new MockAuthError('Invalid API key', 401));
    const res = await POST(makeRequest({}), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when task not found', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const res = await POST(makeRequest({}), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 409 when transition invalid', async () => {
    mockLimit.mockResolvedValueOnce([{ id: 1, status: 'backlog' }]);
    mockValidateTransition.mockReturnValue({ valid: false, error: 'Invalid transition' });
    const res = await POST(makeRequest({}), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(409);
  });

  it('moves task to code-review on success', async () => {
    mockLimit.mockResolvedValueOnce([{ id: 1, status: 'in-progress' }]);
    mockReturning.mockResolvedValueOnce([{ id: 1, status: 'code-review' }]);
    mockValues.mockResolvedValueOnce(undefined);

    const res = await POST(
      makeRequest({ commitHash: 'abc123', branch: 'feat/test' }),
      { params: Promise.resolve({ id: '1' }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('code-review');
  });

  it('calls requireRole with coder and admin', async () => {
    mockLimit.mockResolvedValueOnce([{ id: 1, status: 'in-progress' }]);
    mockReturning.mockResolvedValueOnce([{ id: 1, status: 'code-review' }]);
    mockValues.mockResolvedValueOnce(undefined);

    await POST(makeRequest({}), { params: Promise.resolve({ id: '1' }) });
    expect(mockRequireRole).toHaveBeenCalledWith(expect.anything(), ['coder', 'admin']);
  });
});
