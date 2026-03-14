import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains, domainScores } from '@/lib/domains-schema';
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
 * GET /api/domains/:id/scores — Score history for a domain
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

    const scores = await domainsDb
      .select()
      .from(domainScores)
      .where(eq(domainScores.domainId, id))
      .orderBy(desc(domainScores.scoredAt));

    return createSuccessResponse(scores);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/domains/:id/scores — Log a score
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

    if (body.score == null || !body.scoreBreakdown) {
      return createErrorResponse('score and scoreBreakdown are required', 400);
    }

    const [created] = await domainsDb
      .insert(domainScores)
      .values({
        domainId: id,
        score: body.score,
        scoreBreakdown: typeof body.scoreBreakdown === 'string'
          ? body.scoreBreakdown
          : JSON.stringify(body.scoreBreakdown),
        scoredAt: new Date().toISOString(),
      })
      .returning();

    // Also update the domain's score field
    await domainsDb
      .update(domains)
      .set({ score: body.score, updatedAt: new Date().toISOString() })
      .where(eq(domains.id, id));

    return createSuccessResponse(created, 'Score logged', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}
