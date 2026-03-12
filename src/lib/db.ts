import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { join } from 'path';

// Database path - use environment variable or default to local database
const DB_PATH = process.env.DATABASE_URL || join(process.cwd(), 'data', 'agentflow.db');

// Ensure data directory exists
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Create SQLite connection
const sqlite = new Database(DB_PATH);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

/**
 * Run database migrations
 */
export function runMigrations() {
  try {
    migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export function closeDatabase() {
  sqlite.close();
}

/**
 * Get database instance for raw queries if needed
 */
export function getRawDatabase() {
  return sqlite;
}

// Gracefully close database on process termination
process.on('SIGTERM', closeDatabase);
process.on('SIGINT', closeDatabase);
process.on('exit', closeDatabase);

export default db;