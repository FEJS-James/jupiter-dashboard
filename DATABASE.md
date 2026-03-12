# Database Layer Documentation

This document describes the database implementation for AgentFlow using Drizzle ORM with SQLite.

## Schema Overview

The database consists of 5 main tables with proper relationships:

### Tables

1. **projects** - Project information
   - id (primary key)
   - name, description, status
   - tech_stack (JSON array)
   - repo_url, timestamps

2. **agents** - Agent definitions
   - id (primary key)  
   - name (unique), role, color
   - avatar_url, status, current_task_id
   - timestamps

3. **tasks** - Task management
   - id (primary key)
   - project_id (foreign key)
   - title, description, status, priority
   - assigned_agent (references agent name)
   - tags (JSON array), due_date, effort
   - dependencies (JSON array of task IDs)
   - timestamps

4. **activity** - Audit log
   - id (primary key)
   - project_id, task_id, agent_id (foreign keys)
   - action, details (JSON)
   - timestamp

5. **comments** - Task discussions
   - id (primary key)
   - task_id, agent_id (foreign keys)
   - content, timestamp

## File Structure

```
src/lib/
├── schema.ts     # All table definitions and relationships
├── db.ts         # Database connection and utilities
drizzle/          # Migration files (auto-generated)
seed.ts           # Initial data seeding
drizzle.config.ts # Drizzle configuration
```

## Database Scripts

```bash
# Generate new migration
npm run db:generate

# Apply migrations  
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Seed database with initial data
npm run db:seed

# Reset database completely
npm run db:reset

# Open Drizzle Studio (GUI)
npm run db:studio

# Test database operations
npm run db:test
```

## Initial Data

The seed script creates:
- 3 default agents (coder, reviewer, devops)
- 1 demo project with sample tasks
- Activity records showing task progress

## TypeScript Integration

Drizzle automatically generates TypeScript types:

```typescript
import { type Agent, type Task, type Project } from '@/lib/schema';

// Full type safety for all operations
const agents: Agent[] = await db.select().from(agents);
```

## Relationships

- Projects have many tasks
- Tasks belong to a project and can be assigned to an agent  
- Agents can have many assigned tasks
- Activity tracks all changes across projects/tasks
- Comments are attached to specific tasks

All foreign keys have proper cascade/set null rules for data integrity.