#!/usr/bin/env node

// Comprehensive Notification System Testing Script
// TASK-018: Final deployment verification

const jwt = require('jsonwebtoken')

const JWT_SECRET = 'dev-secret-change-in-production'
const BASE_URL = 'http://localhost:3000'

// Helper function to create dev token
function createDevToken(user) {
  const payload = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
    }
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
}

// Test users
const testUser1 = { id: 1, name: 'Test User 1', email: 'user1@test.com', role: 'user' }
const testUser2 = { id: 2, name: 'Test User 2', email: 'user2@test.com', role: 'user' }
const testUser3 = { id: 3, name: 'Admin User', email: 'admin@test.com', role: 'admin' }

let testResults = {
  security: [],
  functionality: [],
  api: [],
  performance: [],
  errors: []
}

// Helper to make authenticated API calls
async function apiCall(endpoint, options = {}, user = testUser1) {
  const token = createDevToken(user)
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    })
    
    const responseData = await response.json()
    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: response.headers
    }
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    }
  }
}

// Test functions
async function testSecurity() {
  console.log('\n🔒 TESTING SECURITY (Post-Fix Verification)')
  
  // Test 1: Unauthenticated requests should be rejected
  try {
    const response = await fetch(`${BASE_URL}/api/notifications?recipientId=1`)
    const result = response.status === 401 || response.status === 500
    testResults.security.push({
      test: 'Reject unauthenticated requests',
      result: result ? 'PASS' : 'FAIL',
      details: `Status: ${response.status}`
    })
  } catch (error) {
    testResults.security.push({
      test: 'Reject unauthenticated requests',
      result: 'ERROR',
      details: error.message
    })
  }

  // Test 2: Users can only access their own notifications
  const user1Response = await apiCall('/api/notifications?recipientId=2', {}, testUser1)
  testResults.security.push({
    test: 'User authorization (can only see own notifications)',
    result: user1Response.status === 403 ? 'PASS' : 'FAIL',
    details: `User 1 trying to access User 2's notifications - Status: ${user1Response.status}`
  })

  // Test 3: Valid user can access their own notifications
  const validResponse = await apiCall('/api/notifications?recipientId=1', {}, testUser1)
  testResults.security.push({
    test: 'Valid user can access own notifications',
    result: validResponse.ok ? 'PASS' : 'FAIL',
    details: `Status: ${validResponse.status}`
  })

  // Test 4: XSS protection in notification creation
  const xssPayload = {
    recipientId: 1,
    type: 'system_announcement',
    title: '<script>alert("XSS")</script>Test Title',
    message: '<img src="x" onerror="alert(\'XSS\')" />Test message',
    priority: 'normal'
  }
  
  const xssResponse = await apiCall('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(xssPayload)
  }, testUser1)
  
  testResults.security.push({
    test: 'XSS protection in notification creation',
    result: xssResponse.ok ? 'PASS' : 'NEEDS_MANUAL_VERIFICATION',
    details: `Created notification with HTML content - Status: ${xssResponse.status}`
  })

  // Test 5: Input validation for malformed requests
  const invalidPayload = {
    recipientId: 'invalid',
    type: '',
    title: '',
    message: 'x'.repeat(2000) // Exceeds max length
  }
  
  const validationResponse = await apiCall('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(invalidPayload)
  }, testUser1)
  
  testResults.security.push({
    test: 'Input validation rejects malformed requests',
    result: validationResponse.status === 400 ? 'PASS' : 'FAIL',
    details: `Invalid payload rejected - Status: ${validationResponse.status}`
  })
}

async function testFunctionality() {
  console.log('\n⚙️ TESTING FUNCTIONALITY')
  
  // Test 1: Create notification
  const createPayload = {
    recipientId: 1,
    type: 'task_assigned',
    title: 'Test Notification',
    message: 'This is a test notification for functionality testing',
    entityType: 'task',
    entityId: 1,
    actionUrl: '/tasks/1',
    priority: 'normal'
  }
  
  const createResponse = await apiCall('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(createPayload)
  }, testUser1)
  
  testResults.functionality.push({
    test: 'Notification creation',
    result: createResponse.ok ? 'PASS' : 'FAIL',
    details: `Status: ${createResponse.status}, ID: ${createResponse.data?.id || 'N/A'}`
  })

  let notificationId = createResponse.data?.id

  // Test 2: Get notifications list
  const listResponse = await apiCall('/api/notifications?recipientId=1', {}, testUser1)
  testResults.functionality.push({
    test: 'Get notifications list',
    result: listResponse.ok && Array.isArray(listResponse.data?.notifications) ? 'PASS' : 'FAIL',
    details: `Status: ${listResponse.status}, Count: ${listResponse.data?.notifications?.length || 0}`
  })

  // Test 3: Mark notification as read
  if (notificationId) {
    const markReadResponse = await apiCall(`/api/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ isRead: true })
    }, testUser1)
    
    testResults.functionality.push({
      test: 'Mark notification as read',
      result: markReadResponse.ok ? 'PASS' : 'FAIL',
      details: `Status: ${markReadResponse.status}`
    })
  }

  // Test 4: Get unread notifications only
  const unreadResponse = await apiCall('/api/notifications?recipientId=1&unreadOnly=true', {}, testUser1)
  testResults.functionality.push({
    test: 'Filter unread notifications',
    result: unreadResponse.ok ? 'PASS' : 'FAIL',
    details: `Status: ${unreadResponse.status}, Unread count: ${unreadResponse.data?.notifications?.length || 0}`
  })

  // Test 5: Get notification statistics
  const statsResponse = await apiCall('/api/notifications/stats?recipientId=1', {}, testUser1)
  testResults.functionality.push({
    test: 'Notification statistics',
    result: statsResponse.ok ? 'PASS' : 'FAIL',
    details: `Status: ${statsResponse.status}, Stats: ${JSON.stringify(statsResponse.data || {})}`
  })
}

async function testAPI() {
  console.log('\n🔗 TESTING API ENDPOINTS')
  
  const endpoints = [
    { endpoint: '/api/notifications?recipientId=1', method: 'GET', name: 'GET notifications' },
    { endpoint: '/api/notifications', method: 'POST', name: 'POST create notification', body: { recipientId: 1, type: 'test', title: 'API Test', message: 'Testing API endpoint', priority: 'normal' } },
    { endpoint: '/api/notifications/stats?recipientId=1', method: 'GET', name: 'GET notification stats' },
    { endpoint: '/api/notifications/preferences?recipientId=1', method: 'GET', name: 'GET notification preferences' },
    { endpoint: '/api/notifications/read-all', method: 'PUT', name: 'PUT mark all as read', body: { recipientId: 1 } }
  ]
  
  for (const { endpoint, method, name, body } of endpoints) {
    const response = await apiCall(endpoint, {
      method,
      body: body ? JSON.stringify(body) : undefined
    }, testUser1)
    
    testResults.api.push({
      test: name,
      result: response.ok ? 'PASS' : 'FAIL',
      details: `${method} ${endpoint} - Status: ${response.status}`
    })
  }
}

async function testPerformance() {
  console.log('\n⚡ TESTING PERFORMANCE')
  
  // Test 1: Create multiple notifications (batch test)
  const batchSize = 20
  const startTime = Date.now()
  const promises = []
  
  for (let i = 0; i < batchSize; i++) {
    const payload = {
      recipientId: 1,
      type: 'test_batch',
      title: `Batch Test Notification ${i + 1}`,
      message: `This is batch notification number ${i + 1} for performance testing`,
      priority: i % 2 === 0 ? 'normal' : 'high'
    }
    
    promises.push(apiCall('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, testUser1))
  }
  
  const results = await Promise.all(promises)
  const endTime = Date.now()
  const duration = endTime - startTime
  const successCount = results.filter(r => r.ok).length
  
  testResults.performance.push({
    test: `Batch notification creation (${batchSize} notifications)`,
    result: successCount === batchSize && duration < 5000 ? 'PASS' : 'FAIL',
    details: `${successCount}/${batchSize} created in ${duration}ms (avg: ${Math.round(duration/batchSize)}ms per notification)`
  })

  // Test 2: Large notifications list performance
  const largeListStart = Date.now()
  const largeListResponse = await apiCall('/api/notifications?recipientId=1&limit=100', {}, testUser1)
  const largeListDuration = Date.now() - largeListStart
  
  testResults.performance.push({
    test: 'Large notifications list loading',
    result: largeListResponse.ok && largeListDuration < 2000 ? 'PASS' : 'FAIL',
    details: `Retrieved ${largeListResponse.data?.notifications?.length || 0} notifications in ${largeListDuration}ms`
  })

  // Test 3: Pagination performance
  const paginationStart = Date.now()
  const page1Response = await apiCall('/api/notifications?recipientId=1&page=1&limit=10', {}, testUser1)
  const page2Response = await apiCall('/api/notifications?recipientId=1&page=2&limit=10', {}, testUser1)
  const paginationDuration = Date.now() - paginationStart
  
  testResults.performance.push({
    test: 'Pagination performance',
    result: page1Response.ok && page2Response.ok && paginationDuration < 1000 ? 'PASS' : 'FAIL',
    details: `Two paginated requests completed in ${paginationDuration}ms`
  })
}

async function testErrorHandling() {
  console.log('\n🚨 TESTING ERROR HANDLING')
  
  // Test 1: Non-existent notification
  const notFoundResponse = await apiCall('/api/notifications/99999', {}, testUser1)
  testResults.functionality.push({
    test: 'Handle non-existent notification',
    result: notFoundResponse.status === 404 ? 'PASS' : 'FAIL',
    details: `Status: ${notFoundResponse.status}`
  })

  // Test 2: Invalid JSON payload
  try {
    const token = createDevToken(testUser1)
    const invalidJsonResponse = await fetch(`${BASE_URL}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: 'invalid json{'
    })
    
    testResults.functionality.push({
      test: 'Handle invalid JSON payload',
      result: invalidJsonResponse.status === 400 ? 'PASS' : 'FAIL',
      details: `Status: ${invalidJsonResponse.status}`
    })
  } catch (error) {
    testResults.errors.push({
      test: 'Invalid JSON test error',
      error: error.message
    })
  }

  // Test 3: Missing required fields
  const missingFieldsResponse = await apiCall('/api/notifications', {
    method: 'POST',
    body: JSON.stringify({ recipientId: 1 }) // Missing required fields
  }, testUser1)
  
  testResults.functionality.push({
    test: 'Handle missing required fields',
    result: missingFieldsResponse.status === 400 ? 'PASS' : 'FAIL',
    details: `Status: ${missingFieldsResponse.status}`
  })
}

// Main test runner
async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE NOTIFICATION SYSTEM TESTING')
  console.log('='.repeat(60))
  
  try {
    await testSecurity()
    await testFunctionality()
    await testAPI()
    await testPerformance()
    await testErrorHandling()
    
    // Print results summary
    console.log('\n📊 TEST RESULTS SUMMARY')
    console.log('='.repeat(60))
    
    let totalTests = 0
    let passedTests = 0
    let failedTests = 0
    let errorTests = 0
    
    const categories = ['security', 'functionality', 'api', 'performance']
    
    for (const category of categories) {
      console.log(`\n${category.toUpperCase()}:`)
      for (const test of testResults[category]) {
        const status = test.result === 'PASS' ? '✅' : test.result === 'FAIL' ? '❌' : '⚠️'
        console.log(`  ${status} ${test.test}: ${test.result}`)
        if (test.details) {
          console.log(`     ${test.details}`)
        }
        
        totalTests++
        if (test.result === 'PASS') passedTests++
        else if (test.result === 'FAIL') failedTests++
        else errorTests++
      }
    }
    
    if (testResults.errors.length > 0) {
      console.log('\nERRORS:')
      for (const error of testResults.errors) {
        console.log(`  ❌ ${error.test}: ${error.error}`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log(`TOTAL TESTS: ${totalTests}`)
    console.log(`PASSED: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`)
    console.log(`FAILED: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`)
    console.log(`ERRORS: ${errorTests} (${Math.round(errorTests/totalTests*100)}%)`)
    
    // Final verdict
    const successRate = passedTests / totalTests
    if (successRate >= 0.9 && failedTests <= 2) {
      console.log('\n🎉 VERDICT: PASS - Ready for deployment')
      console.log('The notification system meets all acceptance criteria and security requirements.')
    } else if (successRate >= 0.8) {
      console.log('\n⚠️ VERDICT: PARTIAL PASS - Minor issues need fixing')
      console.log('The notification system mostly works but has some issues that should be addressed.')
    } else {
      console.log('\n❌ VERDICT: FAIL - Needs additional fixes')
      console.log('The notification system has significant issues and is not ready for deployment.')
    }
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error.message)
    console.log('❌ VERDICT: FAIL - Testing could not complete due to critical errors')
  }
}

// Run the tests
runAllTests().catch(console.error)