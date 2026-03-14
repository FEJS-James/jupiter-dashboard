import { NextRequest } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { blogDb } from '@/lib/blog-db';
import { blogs, articles } from '@/lib/blog-schema';
import { verifyBlogApiKey } from '@/lib/blog-auth';
import { createErrorResponse, toISO } from '@/lib/api-utils';

/**
 * GET /api/blogs/[blogId] — Get single blog with stats
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

    const [blog] = await blogDb
      .select()
      .from(blogs)
      .where(eq(blogs.id, id))
      .limit(1);

    if (!blog) {
      return createErrorResponse('Blog not found', 404);
    }

    // Get article counts
    const [stats] = await blogDb
      .select({
        articleCount: sql<number>`count(*)`,
        publishedCount: sql<number>`sum(case when ${articles.status} = 'published' then 1 else 0 end)`,
      })
      .from(articles)
      .where(eq(articles.blogId, id));

    const data = {
      ...blog,
      createdAt: toISO(blog.createdAt),
      updatedAt: toISO(blog.updatedAt),
      articleCount: Number(stats?.articleCount ?? 0),
      publishedCount: Number(stats?.publishedCount ?? 0),
    };

    return Response.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('GET /api/blogs/[blogId] error:', error);
    return createErrorResponse('Failed to fetch blog', 500);
  }
}
