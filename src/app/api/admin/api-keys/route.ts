/**
 * Admin API key management endpoints.
 *
 * POST /api/admin/api-keys — Create a new API key (admin only)
 * GET  /api/admin/api-keys — List all API keys (admin only)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/schema';
import { requireRole, generateApiKey, AuthError } from '@/lib/api-auth';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
} from '@/lib/api-utils';

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  role: z.enum(['coder', 'reviewer', 'tester', 'devops', 'orchestrator', 'admin']),
  agentId: z.number().int().positive().optional(),
});

/**
 * POST — Generate a new API key.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const body = await request.json().catch(() => ({}));
    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('Validation failed', 400, {
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { plaintext, hash, prefix } = generateApiKey();

    const [row] = await db
      .insert(apiKeys)
      .values({
        key: hash,
        keyPrefix: prefix,
        name: parsed.data.name,
        role: parsed.data.role,
        agentId: parsed.data.agentId ?? null,
      })
      .returning();

    return createSuccessResponse(
      {
        id: row.id,
        name: row.name,
        role: row.role,
        key: plaintext, // shown ONCE
        prefix,
      },
      'API key created. Store the key securely — it will not be shown again.',
      201,
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return createErrorResponse(error.message, error.status);
    }
    return handleDatabaseError(error);
  }
}

/**
 * GET — List all API keys (without full key).
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const rows = await db
      .select({
        id: apiKeys.id,
        keyPrefix: apiKeys.keyPrefix,
        name: apiKeys.name,
        role: apiKeys.role,
        agentId: apiKeys.agentId,
        isActive: apiKeys.isActive,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys);

    return createSuccessResponse(rows);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return createErrorResponse(error.message, error.status);
    }
    return handleDatabaseError(error);
  }
}
