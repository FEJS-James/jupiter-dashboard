import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains, domainNotes } from '@/lib/domains-schema';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  parseRequestBody,
} from '@/lib/api-utils';

function parseId(id: string): number | null {
  const n = parseInt(id, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

async function domainExists(id: number): Promise<boolean> {
  const [d] = await domainsDb.select({ id: domains.id }).from(domains).where(eq(domains.id, id)).limit(1);
  return !!d;
}

/**
 * GET /api/domains/:id/notes — List all notes for a domain
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return createErrorResponse('Invalid domain ID', 400);

    if (!(await domainExists(id))) return createErrorResponse('Domain not found', 404);

    const notes = await domainsDb
      .select()
      .from(domainNotes)
      .where(eq(domainNotes.domainId, id))
      .orderBy(desc(domainNotes.createdAt));

    return createSuccessResponse(notes);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/domains/:id/notes — Add a note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return createErrorResponse('Invalid domain ID', 400);

    if (!(await domainExists(id))) return createErrorResponse('Domain not found', 404);

    const body = await parseRequestBody(request);

    if (!body.note) {
      return createErrorResponse('note is required', 400);
    }

    const [created] = await domainsDb
      .insert(domainNotes)
      .values({
        domainId: id,
        note: body.note,
        author: body.author || 'user',
        createdAt: new Date().toISOString(),
      })
      .returning();

    return createSuccessResponse(created, 'Note added', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}
