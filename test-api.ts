/**
 * API Testing Script
 * Tests all REST API endpoints to verify functionality
 */

// Removed unused import: db

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Starting API Tests...\n');
  
  try {
    // Test 1: List all projects
    console.log('1. Testing GET /api/projects');
    const projectsResponse = await fetch(`${API_BASE}/projects`);
    const projectsData = await projectsResponse.json();
    console.log(`   Status: ${projectsResponse.status}`);
    console.log(`   Projects found: ${projectsData.data?.length || 0}\n`);
    
    // Test 2: List all agents
    console.log('2. Testing GET /api/agents');
    const agentsResponse = await fetch(`${API_BASE}/agents`);
    const agentsData = await agentsResponse.json();
    console.log(`   Status: ${agentsResponse.status}`);
    console.log(`   Agents found: ${agentsData.data?.length || 0}\n`);
    
    // Test 3: List all tasks
    console.log('3. Testing GET /api/tasks');
    const tasksResponse = await fetch(`${API_BASE}/tasks`);
    const tasksData = await tasksResponse.json();
    console.log(`   Status: ${tasksResponse.status}`);
    console.log(`   Tasks found: ${tasksData.data?.length || 0}\n`);
    
    // Test 4: Create a new project
    console.log('4. Testing POST /api/projects');
    const newProject = {
      name: 'Test Project API',
      description: 'A test project created via API',
      status: 'active',
      techStack: ['Node.js', 'TypeScript', 'Next.js']
    };
    
    const createProjectResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject)
    });
    const createdProject = await createProjectResponse.json();
    console.log(`   Status: ${createProjectResponse.status}`);
    console.log(`   Created project ID: ${createdProject.data?.id}\n`);
    
    if (createdProject.data?.id) {
      // Test 5: Get project details with stats
      console.log('5. Testing GET /api/projects/[id]');
      const projectDetailResponse = await fetch(`${API_BASE}/projects/${createdProject.data.id}`);
      const projectDetail = await projectDetailResponse.json();
      console.log(`   Status: ${projectDetailResponse.status}`);
      console.log(`   Project: ${projectDetail.data?.name}`);
      console.log(`   Total tasks: ${projectDetail.data?.totalTasks || 0}\n`);
      
      // Test 6: Create a task for this project
      console.log('6. Testing POST /api/tasks');
      const newTask = {
        projectId: createdProject.data.id,
        title: 'Test Task API',
        description: 'A test task created via API',
        priority: 'high',
        assignedAgent: 'jupiter'
      };
      
      const createTaskResponse = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      const createdTask = await createTaskResponse.json();
      console.log(`   Status: ${createTaskResponse.status}`);
      console.log(`   Created task ID: ${createdTask.data?.id}\n`);
      
      if (createdTask.data?.id) {
        // Test 7: Move task to different status
        console.log('7. Testing POST /api/tasks/[id]/move');
        const moveTaskResponse = await fetch(`${API_BASE}/tasks/${createdTask.data.id}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'in-progress',
            assignedAgent: 'jupiter'
          })
        });
        const movedTask = await moveTaskResponse.json();
        console.log(`   Status: ${moveTaskResponse.status}`);
        console.log(`   New status: ${movedTask.data?.status}\n`);
        
        // Test 8: Add comment to task
        console.log('8. Testing POST /api/tasks/[id]/comments');
        const addCommentResponse = await fetch(`${API_BASE}/tasks/${createdTask.data.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'This is a test comment added via API',
            agentId: 1  // Assuming Jupiter agent has ID 1
          })
        });
        const addedComment = await addCommentResponse.json();
        console.log(`   Status: ${addCommentResponse.status}`);
        console.log(`   Comment ID: ${addedComment.data?.id}\n`);
        
        // Test 9: Get task comments
        console.log('9. Testing GET /api/tasks/[id]/comments');
        const getCommentsResponse = await fetch(`${API_BASE}/tasks/${createdTask.data.id}/comments`);
        const commentsData = await getCommentsResponse.json();
        console.log(`   Status: ${getCommentsResponse.status}`);
        console.log(`   Comments found: ${commentsData.data?.length || 0}\n`);
      }
    }
    
    console.log('✅ API Tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API Test failed:', error);
  }
}

// Run tests if server is available
if (process.env.NODE_ENV !== 'production') {
  // This script should be run when the Next.js dev server is running
  console.log('To run API tests:');
  console.log('1. Start the dev server: npm run dev');
  console.log('2. In another terminal: npx ts-node test-api.ts');
}

export { testAPI };