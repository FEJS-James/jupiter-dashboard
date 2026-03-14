import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Utility functions for API routes
 */

export function createErrorResponse(error: string, status: number = 500, details?: unknown) {
  return NextResponse.json({ error, details }, { status });
}

export function createSuccessResponse(data?: unknown, message?: string, status: number = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

/**
 * Create a success response with Cache-Control / stale-while-revalidate headers.
 *
 * @param data        - Response payload
 * @param maxAge      - Freshness window in seconds (default 10)
 * @param swr         - stale-while-revalidate window in seconds (default 30)
 */
export function createCachedSuccessResponse(
  data?: unknown,
  message?: string,
  { maxAge = 10, swr = 30, status = 200 }: { maxAge?: number; swr?: number; status?: number } = {},
) {
  return NextResponse.json(
    { success: true, data, message },
    {
      status,
      headers: {
        'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
      },
    },
  );
}

export function handleZodError(error: ZodError) {
  const issues = error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  
  return createErrorResponse('Validation failed', 400, { issues });
}

export function handleDatabaseError(error: unknown) {
  console.error('Database error:', error);
  
  // Handle common SQLite errors
  if (isUniqueConstraintError(error)) {
    return createErrorResponse('Resource already exists', 409);
  }

  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return createErrorResponse('Referenced resource not found', 400);
    }
  }
  
  return createErrorResponse('Database operation failed', 500);
}

export async function parseRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON in request body');
  }
}

export function extractIdFromParams(params: { id: string }): number {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error('Invalid ID parameter');
  }
  return id;
}

/**
 * Detect unique constraint violations from Drizzle ORM / SQLite.
 *
 * Drizzle wraps the underlying SQLite error, so the unique-constraint
 * indicator can appear at multiple levels:
 *   - err.code            (top-level, sometimes 'SQLITE_CONSTRAINT')
 *   - err.cause?.code     (nested, 'SQLITE_CONSTRAINT_UNIQUE')
 *   - err.message         (may contain 'UNIQUE constraint failed')
 *   - err.cause?.message  (may contain 'UNIQUE constraint failed')
 */
export function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const e = err as Record<string, unknown>;

  // Direct code check (works when the driver doesn't wrap)
  if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return true;

  // Message-level check (top-level)
  if (typeof e.message === 'string' && e.message.includes('UNIQUE constraint failed')) return true;

  // Nested cause check (Drizzle ORM wrapping)
  const cause = e.cause;
  if (cause && typeof cause === 'object') {
    const c = cause as Record<string, unknown>;
    if (c.code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
    if (typeof c.message === 'string' && c.message.includes('UNIQUE constraint failed')) return true;

    // Double-nested cause (observed in some driver versions)
    const cc = c.cause;
    if (cc && typeof cc === 'object') {
      const inner = cc as Record<string, unknown>;
      if (inner.code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
      if (typeof inner.message === 'string' && inner.message.includes('UNIQUE constraint failed')) return true;
    }
  }

  return false;
}

/** Safely convert DB timestamp (Date | number | string) to ISO string */
export function toISO(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'number') return new Date(val * 1000).toISOString();
  return String(val);
}

/** Safely parse JSON text fields from DB (handles string, array, null) */
export function parseJsonField<T>(val: unknown): T | undefined {
  if (val == null) return undefined;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return undefined; } }
  return val as T;
}