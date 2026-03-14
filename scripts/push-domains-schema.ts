/**
 * Push domains schema to the database.
 *
 * Usage:
 *   npx tsx scripts/push-domains-schema.ts
 *
 * Uses TURSO_DOMAINS_DATABASE_URL and TURSO_DOMAINS_AUTH_TOKEN env vars.
 * Falls back to file:./data/domains.db for local development.
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

async function main() {
  const url = process.env.TURSO_DOMAINS_DATABASE_URL || 'file:./data/domains.db';
  const authToken = process.env.TURSO_DOMAINS_AUTH_TOKEN;

  console.log(`🔌 Connecting to: ${url.startsWith('file:') ? url : url.replace(/\/\/.*@/, '//***@')}`);

  // Ensure data directory exists for local file-based databases
  if (url.startsWith('file:')) {
    const filePath = url.replace('file:', '');
    const dataDir = dirname(filePath);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created directory: ${dataDir}`);
    }
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  console.log('🚀 Running migrations from ./drizzle-domains ...');
  await migrate(db, { migrationsFolder: './drizzle-domains' });

  console.log('✅ Domains schema pushed successfully!');

  // Verify tables
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(`\n📋 Tables in database:`);
  for (const row of result.rows) {
    console.log(`   - ${row.name}`);
  }

  client.close();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
