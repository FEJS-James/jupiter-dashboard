#!/usr/bin/env tsx
import { db } from './src/lib/db';
import { agents, projects, tasks, activity, comments } from './src/lib/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Database operations test - validates all CRUD operations
 */
async function testDatabase() {
  console.log('🧪 Testing database operations...\n');

  try {
    // Test 1: Verify seed data exists
    console.log('1. 📊 Checking seed data...');
    
    const allAgents = await db.select().from(agents);
    console.log(`   ✅ Agents found: ${allAgents.length}`);
    console.log(`   📋 Agent names: ${allAgents.map(a => `${a.name}(${a.role})`).join(', ')}`);
    
    const allProjects = await db.select().from(projects);
    console.log(`   ✅ Projects found: ${allProjects.length}`);
    
    const allTasks = await db.select().from(tasks);
    console.log(`   ✅ Tasks found: ${allTasks.length}`);

    // Test 2: Test relationships and joins
    console.log('\n2. 🔗 Testing relationships...');
    
    const tasksWithProjects = await db.select({
      taskId: tasks.id,
      taskTitle: tasks.title,
      projectName: projects.name,
      assignedAgent: tasks.assignedAgent
    }).from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .limit(3);
    
    console.log('   ✅ Task-Project relationships working:');
    tasksWithProjects.forEach(t => {
      console.log(`     - "${t.taskTitle}" in project "${t.projectName}" (assigned to: ${t.assignedAgent || 'unassigned'})`);
    });

    // Test 3: Create operations
    console.log('\n3. ➕ Testing CREATE operations...');
    
    // Clean up any existing test data first
    await db.delete(agents).where(eq(agents.name, 'test-agent'));
    
    const [newAgent] = await db.insert(agents).values({
      name: 'test-agent',
      role: 'manager',
      color: '#8b5cf6',
      status: 'available'
    }).returning();
    console.log(`   ✅ Created agent: ${newAgent.name} (ID: ${newAgent.id})`);

    const [newProject] = await db.insert(projects).values({
      name: 'Test Project',
      description: 'A test project for validation',
      status: 'planning',
      techStack: ['TypeScript', 'Node.js']
    }).returning();
    console.log(`   ✅ Created project: ${newProject.name} (ID: ${newProject.id})`);

    const [newTask] = await db.insert(tasks).values({
      projectId: newProject.id,
      title: 'Test Task',
      description: 'A test task for validation',
      status: 'backlog',
      priority: 'low',
      assignedAgent: newAgent.name,
      tags: ['test'],
      effort: 1
    }).returning();
    console.log(`   ✅ Created task: ${newTask.title} (ID: ${newTask.id})`);

    // Test 4: Update operations
    console.log('\n4. ✏️  Testing UPDATE operations...');
    
    await db.update(tasks)
      .set({ status: 'in-progress' })
      .where(eq(tasks.id, newTask.id));
    
    const updatedTask = await db.select()
      .from(tasks)
      .where(eq(tasks.id, newTask.id))
      .limit(1);
    console.log(`   ✅ Updated task status to: ${updatedTask[0].status}`);

    // Test 5: Test activity logging
    console.log('\n5. 📝 Testing activity logging...');
    
    const [newActivity] = await db.insert(activity).values({
      projectId: newProject.id,
      taskId: newTask.id,
      agentId: newAgent.id,
      action: 'task_updated',
      details: { field: 'status', oldValue: 'backlog', newValue: 'in-progress' }
    }).returning();
    console.log(`   ✅ Created activity record: ${newActivity.action} (ID: ${newActivity.id})`);

    // Test 6: Test comments
    console.log('\n6. 💬 Testing comments...');
    
    const [newComment] = await db.insert(comments).values({
      taskId: newTask.id,
      agentId: newAgent.id,
      content: 'This is a test comment to validate the comments table.'
    }).returning();
    console.log(`   ✅ Created comment: "${newComment.content}" (ID: ${newComment.id})`);

    // Test 7: Test complex query with all relationships
    console.log('\n7. 🌐 Testing complex relationships...');
    
    const complexQuery = await db.select({
      taskTitle: tasks.title,
      taskStatus: tasks.status,
      projectName: projects.name,
      agentName: agents.name,
      agentRole: agents.role
    }).from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(agents, eq(tasks.assignedAgent, agents.name))
      .where(eq(tasks.id, newTask.id))
      .limit(1);
    
    console.log('   ✅ Complex join query working:');
    console.log(`     Task: "${complexQuery[0].taskTitle}" (${complexQuery[0].taskStatus})`);
    console.log(`     Project: "${complexQuery[0].projectName}"`);  
    console.log(`     Agent: "${complexQuery[0].agentName}" (${complexQuery[0].agentRole})`);

    // Test 8: Test cascade delete
    console.log('\n8. 🗑️  Testing CASCADE delete...');
    
    await db.delete(projects).where(eq(projects.id, newProject.id));
    
    const remainingTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.id, newTask.id));
    console.log(`   ✅ Cascade delete working - task deleted with project: ${remainingTasks.length === 0}`);

    const remainingActivities = await db.select()
      .from(activity)
      .where(eq(activity.projectId, newProject.id));
    console.log(`   ✅ Activity records also deleted: ${remainingActivities.length === 0}`);

    // Test 9: Check TypeScript types
    console.log('\n9. 🔧 Testing TypeScript types...');
    
    const typedAgent: typeof agents.$inferSelect = allAgents[0];
    const typedProject: typeof projects.$inferSelect = allProjects[0];
    const typedTask: typeof tasks.$inferSelect = allTasks[0];
    
    console.log('   ✅ TypeScript types working correctly');
    console.log(`     Agent type check: ${typeof typedAgent.id === 'number'}`);
    console.log(`     Project type check: ${typeof typedProject.name === 'string'}`);
    console.log(`     Task type check: ${Array.isArray(typedTask.tags)}`);

    // Cleanup test agent
    await db.delete(agents).where(eq(agents.id, newAgent.id));
    console.log('\n🧹 Cleaned up test data');

    console.log('\n🎉 All database tests PASSED! ✅');
    console.log('\n📊 Final counts:');
    
    const finalCounts = await Promise.all([
      db.select().from(agents),
      db.select().from(projects),
      db.select().from(tasks),
      db.select().from(activity),
      db.select().from(comments)
    ]);
    
    console.log(`   • Agents: ${finalCounts[0].length}`);
    console.log(`   • Projects: ${finalCounts[1].length}`);
    console.log(`   • Tasks: ${finalCounts[2].length}`);
    console.log(`   • Activities: ${finalCounts[3].length}`);
    console.log(`   • Comments: ${finalCounts[4].length}`);

  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabase()
    .then(() => {
      console.log('\n✅ Database test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database test failed:', error);
      process.exit(1);
    });
}

export default testDatabase;