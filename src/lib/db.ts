import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Database URL - use Turso in production, local file in development
const url = process.env.TURSO_DATABASE_URL || 'file:./data/agentflow.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

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

// Create libSQL client
const client = createClient({
  url,
  authToken,
});

// Create Drizzle instance
export const db = drizzle(client, { schema });

export default db;
