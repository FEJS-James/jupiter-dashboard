// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tasks/1/submit-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tasks/[id]/submit-test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockDb.update.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) });
    mockDb.insert.mockReturnValue({ values: mockValues });

    mockRequireRole.mockResolvedValue({ valid: true, role: 'tester', keyId: 3, name: 'tester-key' });
    mockValidateTransition.mockReturnValue({ valid: true });
  });

  it('returns 400 for missing evidence', async () => {
    const res = await POST(makeRequest({ result: 'pass' }), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(400);
  });

  it('moves to deploying on pass', async () => {
    mockLimit.mockResolvedValueOnce([{ id: 1, status: 'testing' }]);
    mockReturning.mockResolvedValueOnce([{ id: 1, status: 'deploying' }]);
    mockValues.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({ result: 'pass', evidence: 'All 42 tests pass' }), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('deploying');
  });

  it('moves to in-progress on fail', async () => {
    mockLimit.mockResolvedValueOnce([{ id: 1, status: 'testing' }]);
    mockReturning.mockResolvedValueOnce([{ id: 1, status: 'in-progress' }]);
    mockValues.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({ result: 'fail', evidence: '3 tests failed' }), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('in-progress');
  });

  it('calls requireRole with tester and admin', async () => {
    mockLimit.mockResolvedValueOnce([{ id: 1, status: 'testing' }]);
    mockReturning.mockResolvedValueOnce([{ id: 1, status: 'deploying' }]);
    mockValues.mockResolvedValueOnce(undefined);

    await POST(makeRequest({ result: 'pass', evidence: 'ok' }), { params: Promise.resolve({ id: '1' }) });
    expect(mockRequireRole).toHaveBeenCalledWith(expect.anything(), ['tester', 'admin']);
  });
});
