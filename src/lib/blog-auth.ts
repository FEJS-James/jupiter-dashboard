import { NextRequest } from 'next/server';
import { createErrorResponse } from './api-utils';

/**
 * Verify the BLOG_API_KEY from the Authorization header.
 * Returns null if valid, or an error NextResponse if invalid.
 */
export function verifyBlogApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Missing or malformed Authorization header', 401);
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const expectedKey = process.env.BLOG_API_KEY;

  if (!expectedKey) {
    console.error('BLOG_API_KEY environment variable is not set');
    return createErrorResponse('Server configuration error', 500);
  }

  if (token !== expectedKey) {
    return createErrorResponse('Invalid API key', 401);
  }

  return null; // auth passed
}

/**
 * Compute word count from text content.
 */
export function computeWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Compute reading time in minutes from word count.
 * Formula: words ÷ 250, rounded up, minimum 3 minutes.
 */
export function computeReadingTime(wordCount: number): number {
  return Math.max(3, Math.ceil(wordCount / 250));
}
