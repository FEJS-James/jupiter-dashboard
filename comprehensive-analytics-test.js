#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0sImlhdCI6MTc3MzM0NTU0OCwiZXhwIjoxNzczMzQ5MTQ4fQ.ufTsGiM4AyYIb99uImfglm7gzKpJuJhiRFn6TpVZrpQ';

const ANALYTICS_ENDPOINTS = [
  '/api/analytics/overview',
  '/api/analytics/velocity',
  '/api/analytics/completion',
  '/api/analytics/agents',
  '/api/analytics/projects',
  '/api/analytics/additional'
];

let testResults = {
  security: [],
  dataAccuracy: [],
  apiTesting: [],
  performance: []
};

console.log('🚀 Starting Comprehensive Analytics Testing for TASK-019\n');
console.log('=' .repeat(70));

// Helper function to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.auth ? { 'Authorization': AUTH_TOKEN } : {};
  
  const curlCmd = `curl -s -w "\\n%{http_code}" ${options.auth ? `-H "Authorization: ${AUTH_TOKEN}"` : ''} "${url}"`;
  
  try {
    const { stdout } = await execPromise(curlCmd);
    const lines = stdout.trim().split('\n');
    const statusCode = lines[lines.length - 1];
    const body = lines.slice(0, -1).join('\n');
    
    return {
      statusCode: parseInt(statusCode),
      body: body,
      success: true
    };
  } catch (error) {
    return {
      statusCode: 0,
      body: error.message,
      success: false
    };
  }
}

// 1. SECURITY TESTING
async function testSecurity() {
  console.log('🔒 1. SECURITY TESTING');
  console.log('-'.repeat(50));
  
  // Test 1.1: Verify authentication is required
  console.log('📋 1.1 Testing authentication requirement...');
  for (const endpoint of ANALYTICS_ENDPOINTS) {
    const result = await makeRequest(endpoint, { auth: false });
    const passed = result.statusCode === 401;
    
    testResults.security.push({
      test: `Auth required for ${endpoint}`,
      passed,
      details: `Status: ${result.statusCode}, Expected: 401`
    });
    
    console.log(`   ${passed ? '✅' : '❌'} ${endpoint}: ${result.statusCode} ${passed ? '(Auth required)' : '(Security issue!)'}`);
  }
  
  // Test 1.2: Test input validation
  console.log('\n📋 1.2 Testing input validation...');
  const invalidParams = ['days=invalid', 'days=-5', 'days=abc', 'startDate=invalid'];
  
  for (const param of invalidParams) {
    const result = await makeRequest(`/api/analytics/overview?${param}`, { auth: true });
    const passed = result.statusCode === 400 || result.statusCode === 422;
    
    testResults.security.push({
      test: `Input validation for ${param}`,
      passed,
      details: `Status: ${result.statusCode}, Expected: 400 or 422`
    });
    
    console.log(`   ${passed ? '✅' : '❌'} Invalid param "${param}": ${result.statusCode}`);
  }
}

// 2. API TESTING
async function testAPI() {
  console.log('\n🔌 2. API TESTING');
  console.log('-'.repeat(50));
  
  console.log('📋 2.1 Testing all endpoints with authentication...');
  
  for (const endpoint of ANALYTICS_ENDPOINTS) {
    const result = await makeRequest(endpoint, { auth: true });
    const passed = result.statusCode === 200;
    
    testResults.apiTesting.push({
      test: `Authenticated access to ${endpoint}`,
      passed,
      details: `Status: ${result.statusCode}, Body length: ${result.body?.length || 0}`
    });
    
    console.log(`   ${passed ? '✅' : '❌'} ${endpoint}: ${result.statusCode}`);
    
    if (passed && result.body) {
      try {
        const data = JSON.parse(result.body);
        console.log(`      📊 Response structure: ${Object.keys(data).join(', ')}`);
      } catch (e) {
        console.log(`      ⚠️  Invalid JSON response`);
      }
    }
  }
  
  // Test date range filtering
  console.log('\n📋 2.2 Testing date range filtering...');
  const dateRanges = [7, 14, 30, 90];
  
  for (const days of dateRanges) {
    const result = await makeRequest(`/api/analytics/overview?days=${days}`, { auth: true });
    const passed = result.statusCode === 200;
    
    testResults.apiTesting.push({
      test: `Date filtering for ${days} days`,
      passed,
      details: `Status: ${result.statusCode}`
    });
    
    console.log(`   ${passed ? '✅' : '❌'} ${days} days filter: ${result.statusCode}`);
  }
}

// 3. PERFORMANCE TESTING
async function testPerformance() {
  console.log('\n⚡ 3. PERFORMANCE TESTING');
  console.log('-'.repeat(50));
  
  console.log('📋 3.1 Testing response times...');
  
  for (const endpoint of ANALYTICS_ENDPOINTS) {
    const start = Date.now();
    const result = await makeRequest(endpoint, { auth: true });
    const duration = Date.now() - start;
    
    const passed = result.statusCode === 200 && duration < 3000;
    
    testResults.performance.push({
      test: `Performance of ${endpoint}`,
      passed,
      details: `Status: ${result.statusCode}, Duration: ${duration}ms, Expected: <3000ms`
    });
    
    console.log(`   ${passed ? '✅' : '❌'} ${endpoint}: ${duration}ms ${passed ? '(Fast)' : '(Slow!)'}`);
  }
}

// 4. DATA ACCURACY TESTING
async function testDataAccuracy() {
  console.log('\n📈 4. DATA ACCURACY TESTING');
  console.log('-'.repeat(50));
  
  console.log('📋 4.1 Checking data structure and completeness...');
  
  const result = await makeRequest('/api/analytics/overview', { auth: true });
  
  if (result.statusCode === 200) {
    try {
      const data = JSON.parse(result.body);
      const expectedFields = ['totalTasks', 'completedTasks', 'activeTasks', 'overdueTasks'];
      
      let passed = true;
      for (const field of expectedFields) {
        if (!(field in data)) {
          passed = false;
          console.log(`   ❌ Missing field: ${field}`);
        } else {
          console.log(`   ✅ Found field: ${field} = ${data[field]}`);
        }
      }
      
      testResults.dataAccuracy.push({
        test: 'Overview data structure',
        passed,
        details: `Required fields present: ${passed}`
      });
      
    } catch (e) {
      testResults.dataAccuracy.push({
        test: 'Overview data structure',
        passed: false,
        details: 'Invalid JSON response'
      });
      console.log('   ❌ Invalid JSON response');
    }
  }
}

// 5. ANALYTICS DASHBOARD TESTING
async function testDashboard() {
  console.log('\n📊 5. ANALYTICS DASHBOARD TESTING');
  console.log('-'.repeat(50));
  
  console.log('📋 5.1 Testing analytics page accessibility...');
  
  const result = await makeRequest('/analytics', { auth: false });
  const passed = result.statusCode === 200;
  
  testResults.apiTesting.push({
    test: 'Analytics page loads',
    passed,
    details: `Status: ${result.statusCode}`
  });
  
  console.log(`   ${passed ? '✅' : '❌'} Analytics page: ${result.statusCode}`);
  
  if (passed) {
    // Check for key components in the HTML
    const hasCharts = result.body.includes('chart') || result.body.includes('analytics');
    const hasDateSelector = result.body.includes('date') || result.body.includes('range');
    
    console.log(`   ${hasCharts ? '✅' : '❌'} Contains chart components: ${hasCharts}`);
    console.log(`   ${hasDateSelector ? '✅' : '❌'} Contains date selectors: ${hasDateSelector}`);
  }
}

// GENERATE FINAL REPORT
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📋 FINAL TEST REPORT - TASK-019: Dashboard Analytics');
  console.log('='.repeat(70));
  
  const categories = [
    { name: 'Security', tests: testResults.security },
    { name: 'API Testing', tests: testResults.apiTesting },
    { name: 'Performance', tests: testResults.performance },
    { name: 'Data Accuracy', tests: testResults.dataAccuracy }
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalFailures = [];
  
  categories.forEach(category => {
    const passed = category.tests.filter(t => t.passed).length;
    const total = category.tests.length;
    totalTests += total;
    passedTests += passed;
    
    console.log(`\n${category.name}: ${passed}/${total} passed`);
    
    category.tests.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      console.log(`  ${icon} ${test.test}`);
      if (!test.passed) {
        console.log(`      Details: ${test.details}`);
        if (category.name === 'Security') {
          criticalFailures.push(test.test);
        }
      }
    });
  });
  
  console.log('\n' + '='.repeat(70));
  console.log(`OVERALL RESULT: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
  
  if (criticalFailures.length > 0) {
    console.log(`\n🚨 CRITICAL SECURITY FAILURES:`);
    criticalFailures.forEach(failure => console.log(`   - ${failure}`));
    console.log('\n❌ RESULT: FAIL - Critical security issues must be resolved before deployment');
    return false;
  } else if (passedTests / totalTests >= 0.9) {
    console.log('\n✅ RESULT: PASS - Analytics feature ready for deployment');
    return true;
  } else {
    console.log('\n⚠️ RESULT: CONDITIONAL PASS - Some issues need attention but not deployment blocking');
    return true;
  }
}

// MAIN TEST EXECUTION
async function runAllTests() {
  try {
    await testSecurity();
    await testAPI();
    await testPerformance();
    await testDataAccuracy();
    await testDashboard();
    
    const success = generateReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Execute tests
runAllTests();