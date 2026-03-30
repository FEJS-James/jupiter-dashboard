/**
 * API key authentication for pipeline endpoints.
 *
 * Keys are SHA-256 hashed for fast DB lookup (not bcrypt).
 * Each key is scoped to a role; endpoints enforce which roles are allowed.
 */

import { createHash, randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/schema';

export interface ApiKeyInfo {
  valid: boolean;
  role: string;
  keyId: number;
  name: string;
}

/**
 * Hash a plaintext API key with SHA-256 (hex-encoded).
 */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Generate a new API key.
 * Returns the plaintext (shown once), its hash (stored), and prefix (for display).
 */
export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString('hex');
  const plaintext = `jd_${raw}`;
  const hash = hashApiKey(plaintext);
  const prefix = plaintext.slice(0, 8);
  return { plaintext, hash, prefix };
}

/**
 * Extract Bearer token from request, hash it, and look it up in the DB.
 * Throws a Response-like object on failure so callers can return it directly.
 */
export async function validateApiKey(request: Request): Promise<ApiKeyInfo> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or malformed Authorization header. Expected: Bearer <api-key>', 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AuthError('Empty bearer token', 401);
  }

  const hash = hashApiKey(token);

  const rows = await db
    .select({
      id: apiKeys.id,
      role: apiKeys.role,
      name: apiKeys.name,
      isActive: apiKeys.isActive,
    })
    .from(apiKeys)
    .where(eq(apiKeys.key, hash))
    .limit(1);

  if (rows.length === 0) {
    throw new AuthError('Invalid API key', 401);
  }

  const row = rows[0];

  if (!row.isActive) {
    throw new AuthError('API key has been deactivated', 401);
  }

  // Update lastUsedAt (fire-and-forget — don't block the request)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, row.id))
    .then(() => {})
    .catch(() => {});

  return { valid: true, role: row.role, keyId: row.id, name: row.name };
}

/**
 * Validate the API key AND check that its role is in the allowed set.
 */
export async function requireRole(request: Request, allowedRoles: string[]): Promise<ApiKeyInfo> {
  const info = await validateApiKey(request);

  if (!allowedRoles.includes(info.role)) {
    throw new AuthError(
      `Role '${info.role}' is not authorized for this endpoint. Required: ${allowedRoles.join(', ')}`,
      403,
    );
  }

  return info;
}

/**
 * Custom error class that carries an HTTP status code.
 */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
