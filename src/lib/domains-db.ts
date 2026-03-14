import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './domains-schema';

const url = process.env.TURSO_DOMAINS_DATABASE_URL || 'file:./data/domains.db';
const authToken = process.env.TURSO_DOMAINS_AUTH_TOKEN;

// Ensure data directory exists for local file-based databases
if (url.startsWith('file:')) {
  const { existsSync, mkdirSync } = require('fs');
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

export const domainsDb = drizzle(client, { schema });

export default domainsDb;
