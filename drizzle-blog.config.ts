import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/blog-schema.ts',
  out: './drizzle-blog',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.BLOG_DATABASE_URL || 'file:./data/blogs.db',
    authToken: process.env.BLOG_AUTH_TOKEN,
  },
  verbose: true,
  strict: true,
} satisfies Config;
