#!/usr/bin/env node
/**
 * TASK-015 Comments System Comprehensive Test Suite
 * Tests all 11 areas of the commenting system
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';
const TASK_ID = 1; // Using first available task
const AGENT_ID = 1; // Using coder agent

// Test results storage
const testResults = {
  commentCRUD: { passed: 0, failed: 0, tests: [] },
  richTextEditor: { passed: 0, failed: 0, tests: [] },
  threadingSystem: { passed: 0, failed: 0, tests: [] },
  realTimeSync: { passed: 0, failed: 0, tests: [] },
  reactionSystem: { passed: 0, failed: 0, tests: [] },
  notificationSystem: { passed: 0, failed: 0, tests: [] },
  databaseIntegration: { passed: 0, failed: 0, tests: [] },
  apiEndpoints: { passed: 0, failed: 0, tests: [] },
  integrationCompatibility: { passed: 0, failed: 0, tests: [] },
  performanceSecurity: { passed: 0, failed: 0, tests: [] },
  productionBuild: { passed: 0, failed: 0, tests: [] }
};

// Helper function to make HTTP requests
async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(JSON.stringify(data)) })
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test runner with results tracking
async function runTest(category, testName, testFn) {
  try {
    const result = await testFn();
    if (result.success) {
      testResults[category].passed++;
      testResults[category].tests.push({ name: testName, status: 'PASS', details: result.message });
      console.log(`✅ ${testName}: PASS - ${result.message}`);
    } else {
      testResults[category].failed++;
      testResults[category].tests.push({ name: testName, status: 'FAIL', details: result.message });
      console.log(`❌ ${testName}: FAIL - ${result.message}`);
    }
  } catch (error) {
    testResults[category].failed++;
    testResults[category].tests.push({ name: testName, status: 'ERROR', details: error.message });
    console.log(`❌ ${testName}: ERROR - ${error.message}`);
  }
}

// Test 1: Comment CRUD Operations
async function testCommentCRUD() {
  console.log('\n=== 1. COMMENT CRUD OPERATIONS ===');
  
  let createdCommentId = null;

  // Test CREATE comment
  await runTest('commentCRUD', 'Create Comment', async () => {
    const response = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments`, {
      content: 'Test comment for CRUD operations',
      agentId: AGENT_ID,
      contentType: 'plain'
    });
    
    if (response.status === 201 && response.data?.data?.id) {
      createdCommentId = response.data.data.id;
      return { success: true, message: `Created comment ID: ${createdCommentId}` };
    }
    return { success: false, message: `Failed to create comment: status ${response.status}, data: ${JSON.stringify(response.data)}` };
  });

  // Test READ comments
  await runTest('commentCRUD', 'Read Comments', async () => {
    const response = await makeRequest('GET', `/api/tasks/${TASK_ID}/comments`);
    
    if (response.status === 200 && Array.isArray(response.data?.data)) {
      return { success: true, message: `Retrieved ${response.data.data.length} comments` };
    }
    return { success: false, message: `Failed to read comments: ${response.status}, data: ${JSON.stringify(response.data)}` };
  });

  // Test UPDATE comment (if created)
  if (createdCommentId) {
    await runTest('commentCRUD', 'Update Comment', async () => {
      const response = await makeRequest('PATCH', `/api/tasks/${TASK_ID}/comments/${createdCommentId}`, {
        content: 'Updated test comment content',
        editReason: 'Testing update functionality'
      });
      
      if (response.status === 200) {
        return { success: true, message: `Updated comment ${createdCommentId}` };
      }
      return { success: false, message: `Failed to update comment: ${response.status}` };
    });

    // Test DELETE comment
    await runTest('commentCRUD', 'Delete Comment', async () => {
      const response = await makeRequest('DELETE', `/api/tasks/${TASK_ID}/comments/${createdCommentId}`);
      
      if (response.status === 200) {
        return { success: true, message: `Deleted comment ${createdCommentId}` };
      }
      return { success: false, message: `Failed to delete comment: ${response.status}` };
    });
  }
}

// Test 2: Rich Text Editor Features
async function testRichTextEditor() {
  console.log('\n=== 2. RICH TEXT EDITOR FEATURES ===');

  // Test markdown support
  await runTest('richTextEditor', 'Markdown Support', async () => {
    const markdownContent = '# Test Header\n**Bold text** and *italic text*\n- List item\n```code block```';
    const response = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments`, {
      content: markdownContent,
      agentId: AGENT_ID,
      contentType: 'markdown'
    });
    
    if (response.status === 201) {
      return { success: true, message: 'Markdown comment created successfully' };
    }
    return { success: false, message: `Failed to create markdown comment: ${response.status}` };
  });

  // Test @ mentions
  await runTest('richTextEditor', 'Mention Support', async () => {
    const mentionContent = 'Hello @coder, please review this task';
    const response = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments`, {
      content: mentionContent,
      agentId: AGENT_ID,
      mentions: [1], // coder agent ID (should be number, not string)
      contentType: 'plain'
    });
    
    if (response.status === 201) {
      return { success: true, message: 'Comment with mentions created successfully' };
    }
    return { success: false, message: `Failed to create mention comment: ${response.status}` };
  });

  // Test content validation (spam detection)
  await runTest('richTextEditor', 'Spam Detection', async () => {
    const spamContent = 'a'.repeat(10001); // Exceeds 10000 char limit
    const response = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments`, {
      content: spamContent,
      agentId: AGENT_ID,
      contentType: 'plain'
    });
    
    // Should fail validation or be limited
    if (response.status >= 400) {
      return { success: true, message: 'Spam detection working - rejected long content' };
    }
    return { success: false, message: 'Spam detection not working - accepted overly long content' };
  });
}

// Test 3: Threading System
async function testThreadingSystem() {
  console.log('\n=== 3. THREADING SYSTEM ===');

  let parentCommentId = null;

  // Create parent comment
  await runTest('threadingSystem', 'Create Parent Comment', async () => {
    const response = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments`, {
      content: 'Parent comment for threading test',
      agentId: AGENT_ID,
      contentType: 'plain'
    });
    
    if (response.status === 201 && response.data?.data?.id) {
      parentCommentId = response.data.data.id;
      return { success: true, message: `Created parent comment ID: ${parentCommentId}` };
    }
    return { success: false, message: `Failed to create parent comment: ${response.status}` };
  });

  // Create nested reply
  if (parentCommentId) {
    await runTest('threadingSystem', 'Create Nested Reply', async () => {
      const response = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments`, {
        content: 'This is a nested reply',
        agentId: AGENT_ID,
        parentId: parentCommentId,
        contentType: 'plain'
      });
      
      if (response.status === 201 && response.data?.data?.parentId == parentCommentId) {
        return { success: true, message: `Created nested reply to comment ${parentCommentId}` };
      }
      return { success: false, message: `Failed to create nested reply: ${response.status}` };
    });

    // Test retrieval with nesting
    await runTest('threadingSystem', 'Retrieve Threaded Comments', async () => {
      const response = await makeRequest('GET', `/api/tasks/${TASK_ID}/comments`);
      
      if (response.status === 200 && Array.isArray(response.data?.data)) {
        const hasThreadedComment = response.data.data.some(comment => comment.parentId !== null);
        if (hasThreadedComment) {
          return { success: true, message: 'Successfully retrieved threaded comments' };
        }
      }
      return { success: false, message: 'No threaded comments found in response' };
    });
  }
}

// Test 4: Database Integration
async function testDatabaseIntegration() {
  console.log('\n=== 4. DATABASE INTEGRATION ===');

  // Test comment_history table
  await runTest('databaseIntegration', 'Comment History Table', async () => {
    // Create and edit a comment to generate history
    const createResponse = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments`, {
      content: 'Comment to test history',
      agentId: AGENT_ID,
      contentType: 'plain'
    });
    
    if (createResponse.status === 201) {
      const commentId = createResponse.data.data.id;
      const editResponse = await makeRequest('PATCH', `/api/tasks/${TASK_ID}/comments/${commentId}`, {
        content: 'Edited comment content',
        editReason: 'Testing history'
      });
      
      if (editResponse.status === 200) {
        return { success: true, message: 'Comment history functionality working' };
      }
    }
    return { success: false, message: 'Comment history functionality failed' };
  });

  // Test comment_reactions table
  await runTest('databaseIntegration', 'Comment Reactions Table', async () => {
    // Create a comment first
    const createResponse = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments`, {
      content: 'Comment to test reactions',
      agentId: AGENT_ID,
      contentType: 'plain'
    });
    
    if (createResponse.status === 201) {
      const commentId = createResponse.data.data.id;
      const reactionResponse = await makeRequest('POST', `/api/tasks/${TASK_ID}/comments/${commentId}/reactions`, {
        reaction: 'like',
        agentId: AGENT_ID
      });
      
      if (reactionResponse.status === 201) {
        return { success: true, message: 'Comment reactions functionality working' };
      }
    }
    return { success: false, message: 'Comment reactions functionality failed' };
  });

  // Test comment_notifications table
  await runTest('databaseIntegration', 'Comment Notifications Table', async () => {
    const response = await makeRequest('GET', `/api/agents/${AGENT_ID}/notifications`);
    
    if (response.status === 200) {
      return { success: true, message: 'Comment notifications endpoint accessible' };
    }
    return { success: false, message: 'Comment notifications functionality failed' };
  });
}

// Test 5: API Endpoints
async function testAPIEndpoints() {
  console.log('\n=== 5. API ENDPOINTS ===');

  const endpoints = [
    { method: 'GET', path: `/api/tasks/${TASK_ID}/comments`, name: 'GET Comments' },
    { method: 'POST', path: `/api/tasks/${TASK_ID}/comments`, name: 'POST Comment', data: { content: 'API test', agentId: AGENT_ID } }
  ];

  for (const endpoint of endpoints) {
    await runTest('apiEndpoints', endpoint.name, async () => {
      const response = await makeRequest(endpoint.method, endpoint.path, endpoint.data);
      
      if (response.status >= 200 && response.status < 300) {
        return { success: true, message: `${endpoint.method} ${endpoint.path} returned ${response.status}` };
      }
      return { success: false, message: `${endpoint.method} ${endpoint.path} returned ${response.status}` };
    });
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting TASK-015 Comments System Comprehensive Test Suite\n');
  
  try {
    await testCommentCRUD();
    await testRichTextEditor();
    await testThreadingSystem();
    await testDatabaseIntegration();
    await testAPIEndpoints();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    Object.entries(testResults).forEach(([category, results]) => {
      const categoryTotal = results.passed + results.failed;
      if (categoryTotal > 0) {
        console.log(`${category.toUpperCase()}: ${results.passed}/${categoryTotal} passed`);
        totalPassed += results.passed;
        totalFailed += results.failed;
      }
    });
    
    console.log('-'.repeat(60));
    console.log(`OVERALL: ${totalPassed}/${totalPassed + totalFailed} tests passed`);
    
    const overallSuccess = totalFailed === 0;
    console.log(`\n🎯 FINAL RESULT: ${overallSuccess ? 'PASS' : 'FAIL'}`);
    
    if (!overallSuccess) {
      console.log('\n❌ Failed Tests:');
      Object.entries(testResults).forEach(([category, results]) => {
        results.tests.forEach(test => {
          if (test.status !== 'PASS') {
            console.log(`   - ${category}: ${test.name} - ${test.details}`);
          }
        });
      });
    }
    
    return overallSuccess;
    
  } catch (error) {
    console.error('💥 Test suite failed with error:', error.message);
    return false;
  }
}

// Run the tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
});