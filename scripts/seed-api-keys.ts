/**
 * Seed script — generates one API key per role and inserts hashed keys into the DB.
 * Prints plaintext keys to stdout for initial setup.
 *
 * Usage: npx tsx scripts/seed-api-keys.ts
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { createHash, randomBytes } from 'crypto';
import { apiKeys } from '../src/lib/schema';

const ROLES = ['coder', 'reviewer', 'tester', 'devops', 'orchestrator', 'admin'] as const;

function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString('hex');
  const plaintext = `jd_${raw}`;
  const hash = createHash('sha256').update(plaintext).digest('hex');
  const prefix = plaintext.slice(0, 8);
  return { plaintext, hash, prefix };
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL || 'file:./data/agentflow.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  console.log('🔑 Seeding API keys...\n');
  console.log('='.repeat(80));

  for (const role of ROLES) {
    const { plaintext, hash, prefix } = generateApiKey();

    await db.insert(apiKeys).values({
      key: hash,
      keyPrefix: prefix,
      name: `${role}-default`,
      role,
      agentId: null,
    });

    console.log(`  ${role.toUpperCase().padEnd(14)} ${plaintext}`);
  }

  console.log('='.repeat(80));
  console.log('\n⚠️  Store these keys securely — they will NOT be shown again.');
  console.log('✅ Done.\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
