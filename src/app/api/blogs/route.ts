import { NextRequest } from 'next/server';
import { blogDb } from '@/lib/blog-db';
import { blogs } from '@/lib/blog-schema';
import { verifyBlogApiKey } from '@/lib/blog-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { toISO } from '@/lib/api-utils';

function serializeBlog(blog: typeof blogs.$inferSelect) {
  return {
    ...blog,
    createdAt: toISO(blog.createdAt),
    updatedAt: toISO(blog.updatedAt),
  };
}

/**
 * GET /api/blogs — List all blogs
 */
export async function GET(request: NextRequest) {
  const authError = verifyBlogApiKey(request);
  if (authError) return authError;

  try {
    const allBlogs = await blogDb.select().from(blogs);
    const data = Array.isArray(allBlogs) ? allBlogs.map(serializeBlog) : [];

    return Response.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('GET /api/blogs error:', error);
    return createErrorResponse('Failed to fetch blogs', 500);
  }
}
