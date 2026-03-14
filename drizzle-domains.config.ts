import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/domains-schema.ts',
  out: './drizzle-domains',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DOMAINS_DATABASE_URL || 'file:./data/domains.db',
    authToken: process.env.TURSO_DOMAINS_AUTH_TOKEN,
  },
  verbose: true,
  strict: true,
} satisfies Config;
