#!/usr/bin/env tsx
import { db, getRawDatabase } from './src/lib/db';
import { agents, projects, tasks } from './src/lib/schema';

/**
 * Test database performance and configuration
 */
async function testDatabasePerformance() {
  console.log('⚡ Testing database performance and configuration...\n');

  try {
    const rawDb = getRawDatabase();

    // Test 1: Verify WAL mode
    console.log('1. 📊 Checking database configuration...');
    
    const walMode = rawDb.pragma('journal_mode', { simple: true });
    console.log(`   ✅ Journal mode: ${walMode}`);
    
    const foreignKeys = rawDb.pragma('foreign_keys', { simple: true });
    console.log(`   ✅ Foreign keys: ${foreignKeys === 1 ? 'ENABLED' : 'DISABLED'}`);
    
    const synchronous = rawDb.pragma('synchronous', { simple: true });
    console.log(`   ✅ Synchronous: ${synchronous}`);

    // Test 2: Check indexing
    console.log('\n2. 🗂️  Checking indexes...');
    
    const indexes = rawDb.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all();
    console.log(`   ✅ Found ${indexes.length} custom indexes:`);
    indexes.forEach(idx => {
      console.log(`     - ${idx.name} on table ${idx.tbl_name}`);
    });

    // Test 3: Performance test with bulk operations
    console.log('\n3. ⚡ Performance testing...');
    
    const startTime = Date.now();
    
    // Bulk insert test
    const testAgents = [];
    for (let i = 0; i < 100; i++) {
      testAgents.push({
        name: `perf-agent-${i}`,
        role: 'coder' as const,
        color: '#test',
        status: 'available' as const
      });
    }
    
    await db.insert(agents).values(testAgents);
    const insertTime = Date.now() - startTime;
    console.log(`   ✅ Bulk insert (100 agents): ${insertTime}ms`);

    // Bulk select test
    const selectStart = Date.now();
    const allTestAgents = await db.select().from(agents).where('name LIKE "perf-agent-%"');
    const selectTime = Date.now() - selectStart;
    console.log(`   ✅ Bulk select (${allTestAgents.length} agents): ${selectTime}ms`);

    // Complex query test
    const complexStart = Date.now();
    const complexResult = await db.select({
      agentName: agents.name,
      agentRole: agents.role,
      taskCount: 'COUNT(*)'
    }).from(agents)
      .leftJoin(tasks, 'agents.name = tasks.assigned_agent')
      .groupBy(agents.id, agents.name, agents.role)
      .limit(10);
    const complexTime = Date.now() - complexStart;
    console.log(`   ✅ Complex join/group query: ${complexTime}ms`);

    // Clean up performance test data
    await db.delete(agents).where('name LIKE "perf-agent-%"');
    console.log('\n🧹 Cleaned up performance test data');

    // Test 4: Database file info
    console.log('\n4. 📁 Database file information...');
    
    const pageCount = rawDb.pragma('page_count', { simple: true });
    const pageSize = rawDb.pragma('page_size', { simple: true });
    const dbSize = (pageCount * pageSize) / 1024; // KB
    
    console.log(`   ✅ Database size: ${dbSize.toFixed(2)} KB`);
    console.log(`   ✅ Page count: ${pageCount}`);
    console.log(`   ✅ Page size: ${pageSize} bytes`);

    console.log('\n🎉 Performance tests completed! ✅');

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabasePerformance()
    .then(() => {
      console.log('\n✅ Performance test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Performance test failed:', error);
      process.exit(1);
    });
}

export default testDatabasePerformance;