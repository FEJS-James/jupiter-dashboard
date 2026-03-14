import { NextRequest } from 'next/server';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { blogDb } from '@/lib/blog-db';
import { blogs, articles } from '@/lib/blog-schema';
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
 * GET /api/blogs/[blogId]/articles — List articles (paginated) or get by slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  const authError = verifyBlogApiKey(request);
  if (authError) return authError;

  try {
    const { blogId } = await params;
    const id = parseInt(blogId, 10);
    if (isNaN(id) || id <= 0) {
      return createErrorResponse('Invalid blog ID', 400);
    }

    // Verify blog exists
    const [blog] = await blogDb
      .select({ id: blogs.id })
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1);

    if (!blog) {
      return createErrorResponse('Blog not found', 404);
    }

    const url = new URL(request.url);

    // Slug lookup mode
    const slugParam = url.searchParams.get('slug');
    if (slugParam) {
      const [article] = await blogDb
        .select()
        .from(articles)
        .where(and(eq(articles.blogId, id), eq(articles.slug, slugParam)))
        .limit(1);

      if (!article) {
        return createErrorResponse('Article not found', 404);
      }

      return Response.json({ success: true, data: serializeArticle(article) }, { status: 200 });
    }

    // List mode with filters and pagination
    const status = url.searchParams.get('status');
    const tag = url.searchParams.get('tag');
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);
    const orderBy = url.searchParams.get('orderBy') ?? 'publishDate';
    const orderDir = url.searchParams.get('orderDir') === 'asc' ? 'asc' : 'desc';

    // Build conditions
    const conditions = [eq(articles.blogId, id)];
    if (status) {
      conditions.push(eq(articles.status, status as 'draft' | 'published' | 'deleted'));
    }

    const where = and(...conditions);

    // Get total count
    const [countResult] = await blogDb
      .select({ total: sql<number>`count(*)` })
      .from(articles)
      .where(where);

    const total = Number(countResult?.total ?? 0);

    // Determine sort column
    const sortColumn =
      orderBy === 'createdAt' ? articles.createdAt :
      orderBy === 'updatedAt' ? articles.updatedAt :
      orderBy === 'title' ? articles.title :
      articles.publishDate;

    const orderFn = orderDir === 'asc' ? asc : desc;

    let results = await blogDb
      .select()
      .from(articles)
      .where(where)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Filter by tag in-memory (tags is a JSON text column)
    if (tag && Array.isArray(results)) {
      results = results.filter((a) => {
        const parsed = parseJsonField<string[]>(a.tags);
        return Array.isArray(parsed) && parsed.includes(tag);
      });
    }

    const data = Array.isArray(results) ? results.map(serializeArticle) : [];

    return Response.json({ success: true, data, total }, { status: 200 });
  } catch (error) {
    console.error('GET /api/blogs/[blogId]/articles error:', error);
    return createErrorResponse('Failed to fetch articles', 500);
  }
}

/**
 * POST /api/blogs/[blogId]/articles — Create/publish article
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  const authError = verifyBlogApiKey(request);
  if (authError) return authError;

  try {
    const { blogId } = await params;
    const id = parseInt(blogId, 10);
    if (isNaN(id) || id <= 0) {
      return createErrorResponse('Invalid blog ID', 400);
    }

    // Verify blog exists
    const [blog] = await blogDb
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1);

    if (!blog) {
      return createErrorResponse('Blog not found', 404);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    // Validate required fields
    const errors: { field: string; message: string }[] = [];
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      errors.push({ field: 'title', message: 'Title is required' });
    }
    if (!body.slug || typeof body.slug !== 'string' || !body.slug.trim()) {
      errors.push({ field: 'slug', message: 'Slug is required' });
    }
    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      errors.push({ field: 'content', message: 'Content is required' });
    }
    if (!body.metaDescription || typeof body.metaDescription !== 'string' || !(body.metaDescription as string).trim()) {
      errors.push({ field: 'metaDescription', message: 'Meta description is required' });
    }

    if (errors.length > 0) {
      return createErrorResponse('Validation failed', 400, { issues: errors });
    }

    const content = (body.content as string).trim();
    const wordCount = computeWordCount(content);
    const readingTimeMinutes = computeReadingTime(wordCount);

    const now = new Date();

    const newArticle = {
      blogId: id,
      title: (body.title as string).trim(),
      slug: (body.slug as string).trim(),
      content,
      heroImage: typeof body.heroImage === 'string' ? body.heroImage : null,
      author: typeof body.author === 'string' ? body.author : 'Mars',
      excerpt: typeof body.excerpt === 'string' ? body.excerpt : null,
      metaDescription: (body.metaDescription as string).trim(),
      status: (typeof body.status === 'string' && ['draft', 'published', 'deleted'].includes(body.status))
        ? (body.status as 'draft' | 'published' | 'deleted')
        : ('published' as const),
      publishDate: body.status === 'draft' ? null : now,
      hasAffiliateLinks: body.hasAffiliateLinks ? 1 : 0,
      affiliateTag: typeof body.affiliateTag === 'string' ? body.affiliateTag : null,
      tags: Array.isArray(body.tags) ? body.tags : null,
      wordCount,
      readingTimeMinutes,
    };

    let inserted;
    try {
      [inserted] = await blogDb.insert(articles).values(newArticle).returning();
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) {
        return createErrorResponse('An article with this slug already exists in this blog', 409);
      }
      throw err;
    }

    const articleUrl = `/${blog.slug}/${inserted.slug}`;

    return Response.json(
      {
        success: true,
        data: {
          id: inserted.id,
          slug: inserted.slug,
          url: articleUrl,
          status: inserted.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/blogs/[blogId]/articles error:', error);
    return createErrorResponse('Failed to create article', 500);
  }
}
