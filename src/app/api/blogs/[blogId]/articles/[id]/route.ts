import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { blogDb } from '@/lib/blog-db';
import { articles } from '@/lib/blog-schema';
import { verifyBlogApiKey, computeWordCount, computeReadingTime } from '@/lib/blog-auth';
import { createErrorResponse, toISO, parseJsonField, isUniqueConstraintError } from '@/lib/api-utils';

function serializeArticle(article: typeof articles.$inferSelect) {
  return {
    ...article,
    tags: parseJsonField<string[]>(article.tags) ?? [],
    publishDate: article.publishDate ? toISO(article.publishDate) : null,
    createdAt: toISO(article.createdAt),
    updatedAt: toISO(article.updatedAt),
  };
}

/**
 * GET /api/blogs/[blogId]/articles/[id] — Get single article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string; id: string }> }
) {
  const authError = verifyBlogApiKey(request);
  if (authError) return authError;

  try {
    const { blogId, id } = await params;
    const blogIdNum = parseInt(blogId, 10);
    const articleId = parseInt(id, 10);

    if (isNaN(blogIdNum) || blogIdNum <= 0) {
      return createErrorResponse('Invalid blog ID', 400);
    }
    if (isNaN(articleId) || articleId <= 0) {
      return createErrorResponse('Invalid article ID', 400);
    }

    const [article] = await blogDb
      .select()
      .from(articles)
      .where(and(eq(articles.blogId, blogIdNum), eq(articles.id, articleId)))
      .limit(1);

    if (!article) {
      return createErrorResponse('Article not found', 404);
    }

    return Response.json({ success: true, data: serializeArticle(article) }, { status: 200 });
  } catch (error) {
    console.error('GET /api/blogs/[blogId]/articles/[id] error:', error);
    return createErrorResponse('Failed to fetch article', 500);
  }
}

/**
 * PATCH /api/blogs/[blogId]/articles/[id] — Update article
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string; id: string }> }
) {
  const authError = verifyBlogApiKey(request);
  if (authError) return authError;

  try {
    const { blogId, id } = await params;
    const blogIdNum = parseInt(blogId, 10);
    const articleId = parseInt(id, 10);

    if (isNaN(blogIdNum) || blogIdNum <= 0) {
      return createErrorResponse('Invalid blog ID', 400);
    }
    if (isNaN(articleId) || articleId <= 0) {
      return createErrorResponse('Invalid article ID', 400);
    }

    // Verify article exists
    const [existing] = await blogDb
      .select()
      .from(articles)
      .where(and(eq(articles.blogId, blogIdNum), eq(articles.id, articleId)))
      .limit(1);

    if (!existing) {
      return createErrorResponse('Article not found', 404);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Build update object from allowed fields
    const updateData: Record<string, unknown> = {};

    if (typeof body.title === 'string') updateData.title = body.title.trim();
    if (typeof body.slug === 'string') updateData.slug = body.slug.trim();
    if (typeof body.content === 'string') {
      const content = body.content.trim();
      updateData.content = content;
      updateData.wordCount = computeWordCount(content);
      updateData.readingTimeMinutes = computeReadingTime(updateData.wordCount as number);
    }
    if (typeof body.heroImage === 'string') updateData.heroImage = body.heroImage;
    if (typeof body.author === 'string') updateData.author = body.author;
    if (typeof body.excerpt === 'string') updateData.excerpt = body.excerpt;
    if (typeof body.metaDescription === 'string') updateData.metaDescription = body.metaDescription.trim();
    if (typeof body.status === 'string' && ['draft', 'published', 'deleted'].includes(body.status)) {
      updateData.status = body.status;
      // If publishing for the first time, set publish date
      if (body.status === 'published' && existing.status !== 'published' && !existing.publishDate) {
        updateData.publishDate = new Date();
      }
    }
    if (body.hasAffiliateLinks !== undefined) updateData.hasAffiliateLinks = body.hasAffiliateLinks ? 1 : 0;
    if (typeof body.affiliateTag === 'string') updateData.affiliateTag = body.affiliateTag;
    if (Array.isArray(body.tags)) updateData.tags = body.tags;
    if (typeof body.publishDate === 'string') updateData.publishDate = new Date(body.publishDate);

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse('No valid fields to update', 400);
    }

    updateData.updatedAt = new Date();

    let updated;
    try {
      [updated] = await blogDb
        .update(articles)
        .set(updateData)
        .where(and(eq(articles.blogId, blogIdNum), eq(articles.id, articleId)))
        .returning();
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) {
        return createErrorResponse('An article with this slug already exists in this blog', 409);
      }
      throw err;
    }

    return Response.json({ success: true, data: serializeArticle(updated) }, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/blogs/[blogId]/articles/[id] error:', error);
    return createErrorResponse('Failed to update article', 500);
  }
}

/**
 * DELETE /api/blogs/[blogId]/articles/[id] — Soft delete (set status='deleted')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string; id: string }> }
) {
  const authError = verifyBlogApiKey(request);
  if (authError) return authError;

  try {
    const { blogId, id } = await params;
    const blogIdNum = parseInt(blogId, 10);
    const articleId = parseInt(id, 10);

    if (isNaN(blogIdNum) || blogIdNum <= 0) {
      return createErrorResponse('Invalid blog ID', 400);
    }
    if (isNaN(articleId) || articleId <= 0) {
      return createErrorResponse('Invalid article ID', 400);
    }

    // Verify article exists
    const [existing] = await blogDb
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.blogId, blogIdNum), eq(articles.id, articleId)))
      .limit(1);

    if (!existing) {
      return createErrorResponse('Article not found', 404);
    }

    await blogDb
      .update(articles)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(and(eq(articles.blogId, blogIdNum), eq(articles.id, articleId)));

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/blogs/[blogId]/articles/[id] error:', error);
    return createErrorResponse('Failed to delete article', 500);
  }
}
