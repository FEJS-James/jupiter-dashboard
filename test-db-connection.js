import { db } from './src/lib/db.js';
import { tasks } from './src/lib/schema.js';

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Try to select from tasks table
    const result = await db.select().from(tasks).limit(1);
    console.log('✅ Database connection successful');
    console.log('Tasks count:', result.length);
    
    if (result.length > 0) {
      console.log('First task:', result[0]);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
  }
}

testDatabase();