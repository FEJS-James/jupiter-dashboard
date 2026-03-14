import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as blogSchema from './blog-schema';

/**
 * Blog database connection — separate from the main task scheduler DB.
 *
 * Environment variables:
 *   BLOG_DATABASE_URL  – Turso connection URL (or file:./data/blogs.db for local dev)
 *   BLOG_AUTH_TOKEN    – Turso auth token (not needed for local file DB)
 */
const url = process.env.BLOG_DATABASE_URL || 'file:./data/blogs.db';
const authToken = process.env.BLOG_AUTH_TOKEN;

// Ensure data directory exists for local file-based databases
if (url.startsWith('file:')) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { existsSync, mkdirSync } = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { dirname } = require('path');
  const filePath = url.replace('file:', '');
  const dataDir = dirname(filePath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

const client = createClient({
  url,
  authToken,
});

export const blogDb = drizzle(client, { schema: blogSchema });

export default blogDb;
