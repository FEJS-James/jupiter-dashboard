import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createErrorResponse } from '@/lib/api-utils';

/**
 * POST /api/revalidate — On-demand ISR revalidation
 *
 * Body: { paths: string[], blogId: string }
 * Protected by REVALIDATION_SECRET env var.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Missing or malformed Authorization header', 401);
  }

  const token = authHeader.slice(7);
  const secret = process.env.REVALIDATION_SECRET;

  if (!secret) {
    console.error('REVALIDATION_SECRET environment variable is not set');
    return createErrorResponse('Server configuration error', 500);
  }

  if (token !== secret) {
    return createErrorResponse('Invalid revalidation secret', 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid JSON in request body', 400);
  }

  if (!Array.isArray(body.paths) || body.paths.length === 0) {
    return createErrorResponse('Validation failed', 400, {
      issues: [{ field: 'paths', message: 'paths must be a non-empty array of strings' }],
    });
  }

  if (!body.blogId || typeof body.blogId !== 'string') {
    return createErrorResponse('Validation failed', 400, {
      issues: [{ field: 'blogId', message: 'blogId is required' }],
    });
  }

  const paths = body.paths as string[];
  const revalidated: string[] = [];

  for (const path of paths) {
    if (typeof path === 'string' && path.startsWith('/')) {
      try {
        revalidatePath(path);
        revalidated.push(path);
      } catch (err) {
        console.error(`Failed to revalidate path: ${path}`, err);
      }
    }
  }

  return Response.json({ success: true, revalidated }, { status: 200 });
}
