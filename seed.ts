import { db, runMigrations } from './src/lib/db';
import { agents, projects, tasks, activity } from './src/lib/schema';
// Removed unused import: eq

/**
 * Seed the database with initial data
 */
async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Run migrations first
    console.log('📦 Running migrations...');
    runMigrations();

    // Check if agents already exist
    const existingAgents = await db.select().from(agents);
    if (existingAgents.length > 0) {
      console.log('⚠️  Database already seeded, skipping...');
      return;
    }

    // Seed agents
    console.log('👥 Seeding agents...');
    const insertedAgents = await db.insert(agents).values([
      {
        name: 'coder',
        role: 'coder',
        color: '#10b981', // emerald-500
        status: 'available',
      },
      {
        name: 'reviewer',
        role: 'reviewer',
        color: '#f59e0b', // amber-500
        status: 'available',
      },
      {
        name: 'devops',
        role: 'devops',
        color: '#ef4444', // red-500
        status: 'available',
      },
    ]).returning();

    console.log(`✅ Created ${insertedAgents.length} agents`);

    // Create a demo project
    console.log('📋 Creating demo project...');
    const [demoProject] = await db.insert(projects).values({
      name: 'AgentFlow Demo',
      description: 'A demonstration project showing the AgentFlow system in action',
      status: 'active',
      techStack: ['Next.js', 'TypeScript', 'Drizzle ORM', 'SQLite', 'Tailwind CSS'],
    }).returning();

    console.log(`✅ Created demo project: ${demoProject.name}`);

    // Create some demo tasks
    console.log('📝 Creating demo tasks...');
    const demoTasks = await db.insert(tasks).values([
      {
        projectId: demoProject.id,
        title: 'Setup Project Foundation',
        description: 'Initialize Next.js project with TypeScript, Tailwind, and basic structure',
        status: 'done',
        priority: 'high',
        assignedAgent: 'coder',
        tags: ['setup', 'foundation'],
        effort: 3,
      },
      {
        projectId: demoProject.id,
        title: 'Implement Database Schema',
        description: 'Create Drizzle ORM schema with all required tables and relationships',
        status: 'in-progress',
        priority: 'high',
        assignedAgent: 'coder',
        tags: ['database', 'schema'],
        effort: 5,
      },
      {
        projectId: demoProject.id,
        title: 'Build Kanban Board UI',
        description: 'Create drag-and-drop kanban board interface for task management',
        status: 'backlog',
        priority: 'medium',
        tags: ['ui', 'kanban'],
        effort: 8,
      },
    ]).returning();

    console.log(`✅ Created ${demoTasks.length} demo tasks`);

    // Add some activity records
    console.log('📊 Adding activity records...');
    await db.insert(activity).values([
      {
        projectId: demoProject.id,
        taskId: demoTasks[0].id,
        agentId: insertedAgents.find(a => a.name === 'coder')?.id,
        action: 'task_completed',
        details: { previousStatus: 'in-progress', newStatus: 'done' },
      },
      {
        projectId: demoProject.id,
        taskId: demoTasks[1].id,
        agentId: insertedAgents.find(a => a.name === 'coder')?.id,
        action: 'task_started',
        details: { previousStatus: 'backlog', newStatus: 'in-progress' },
      },
    ]);

    console.log('✅ Added activity records');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${insertedAgents.length} agents created`);
    console.log(`   • 1 demo project created`);
    console.log(`   • ${demoTasks.length} demo tasks created`);
    console.log(`   • Activity records initialized`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export default seed;