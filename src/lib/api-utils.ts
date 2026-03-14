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
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return createErrorResponse('Referenced resource not found', 400);
    }
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return createErrorResponse('Resource already exists', 409);
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