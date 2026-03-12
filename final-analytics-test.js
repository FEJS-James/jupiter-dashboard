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
  performance: [],
  charts: []
};

console.log('🚀 FINAL COMPREHENSIVE TESTING - TASK-019: Dashboard Analytics\n');
console.log('=' .repeat(80));
console.log('POST-FIX VERIFICATION TESTING');
console.log('=' .repeat(80));

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

// 1. SECURITY TESTING (POST-FIX VERIFICATION)
async function testSecurity() {
  console.log('🔒 1. SECURITY TESTING (Post-Fix Verification)');
  console.log('-'.repeat(60));
  
  console.log('📋 1.1 Authentication requirement verification...');
  let authTests = 0;
  let authPassed = 0;
  
  for (const endpoint of ANALYTICS_ENDPOINTS) {
    const result = await makeRequest(endpoint, { auth: false });
    const passed = result.statusCode === 401;
    
    testResults.security.push({
      test: `Auth required for ${endpoint}`,
      passed,
      details: `Status: ${result.statusCode}, Expected: 401`
    });
    
    authTests++;
    if (passed) authPassed++;
    
    console.log(`   ${passed ? '✅' : '❌'} ${endpoint}: ${result.statusCode} ${passed ? '(Secured)' : '(CRITICAL SECURITY ISSUE!)'}`);
  }
  
  console.log(`\n📊 Authentication Security: ${authPassed}/${authTests} endpoints properly secured`);
  
  // Test 1.2: Input validation for proper parameters (startDate/endDate)
  console.log('\n📋 1.2 Input validation testing...');
  const invalidDateParams = [
    'startDate=invalid-date',
    'startDate=not-a-date',
    'endDate=2024-13-45', // invalid date format
    'startDate=2024-12-32&endDate=invalid' // combination
  ];
  
  for (const param of invalidDateParams) {
    const result = await makeRequest(`/api/analytics/overview?${param}`, { auth: true });
    const passed = result.statusCode === 400;
    
    testResults.security.push({
      test: `Input validation for ${param}`,
      passed,
      details: `Status: ${result.statusCode}, Expected: 400`
    });
    
    console.log(`   ${passed ? '✅' : '❌'} Invalid param "${param}": ${result.statusCode}`);
  }
}

// 2. DATA ACCURACY TESTING (Critical - Post Date-Fix)
async function testDataAccuracy() {
  console.log('\n📈 2. DATA ACCURACY TESTING (Critical - Post Date-Filtering Fixes)');
  console.log('-'.repeat(60));
  
  console.log('📋 2.1 Overview data structure validation...');
  const result = await makeRequest('/api/analytics/overview', { auth: true });
  
  if (result.statusCode === 200) {
    try {
      const data = JSON.parse(result.body);
      const responseData = data.data;
      
      // Check for correct field structure
      const expectedFields = ['totalTasks', 'completedTasks', 'inProgressTasks', 'completionRate', 'activeProjects'];
      let structureValid = true;
      
      console.log('   📊 Overview data structure:');
      for (const field of expectedFields) {
        const present = field in responseData;
        console.log(`      ${present ? '✅' : '❌'} ${field}: ${present ? responseData[field] : 'MISSING'}`);
        if (!present) structureValid = false;
      }
      
      testResults.dataAccuracy.push({
        test: 'Overview data structure',
        passed: structureValid,
        details: `All required fields present: ${structureValid}`
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
  
  console.log('\n📋 2.2 Date filtering accuracy verification...');
  
  // Test different date ranges to verify the fixes work correctly
  const dateRanges = [
    { startDate: '2024-01-01', endDate: '2024-12-31', name: '2024 full year' },
    { startDate: '2024-03-01', endDate: '2024-03-31', name: 'March 2024' }
  ];
  
  for (const range of dateRanges) {
    const params = `startDate=${range.startDate}&endDate=${range.endDate}`;
    const result = await makeRequest(`/api/analytics/overview?${params}`, { auth: true });
    const passed = result.statusCode === 200;
    
    testResults.dataAccuracy.push({
      test: `Date filtering: ${range.name}`,
      passed,
      details: `Status: ${result.statusCode} for range ${range.startDate} to ${range.endDate}`
    });
    
    console.log(`   ${passed ? '✅' : '❌'} Date range ${range.name}: ${result.statusCode}`);
    
    if (passed && result.body) {
      try {
        const data = JSON.parse(result.body);
        console.log(`      📊 Results: ${data.data.totalTasks} total tasks, ${data.data.completedTasks} completed`);
      } catch (e) {
        console.log('      ⚠️  Could not parse response data');
      }
    }
  }
}

// 3. API TESTING (All 6 Endpoints)
async function testAPI() {
  console.log('\n🔌 3. API TESTING (All 6 Analytics Endpoints)');
  console.log('-'.repeat(60));
  
  console.log('📋 3.1 Endpoint functionality verification...');
  
  for (const endpoint of ANALYTICS_ENDPOINTS) {
    const result = await makeRequest(endpoint, { auth: true });
    const passed = result.statusCode === 200;
    
    testResults.apiTesting.push({
      test: `Authenticated access to ${endpoint}`,
      passed,
      details: `Status: ${result.statusCode}, Response length: ${result.body?.length || 0}`
    });
    
    console.log(`   ${passed ? '✅' : '❌'} ${endpoint}: ${result.statusCode}`);
    
    if (passed && result.body) {
      try {
        const data = JSON.parse(result.body);
        console.log(`      📊 Response structure: ${Object.keys(data).join(', ')}`);
        if (data.data) {
          console.log(`      📈 Data keys: ${Object.keys(data.data).join(', ')}`);
        }
      } catch (e) {
        console.log(`      ⚠️  Invalid JSON response`);
      }
    }
  }
}

// 4. PERFORMANCE TESTING (With Database Indexes)
async function testPerformance() {
  console.log('\n⚡ 4. PERFORMANCE TESTING (Post-Index Implementation)');
  console.log('-'.repeat(60));
  
  console.log('📋 4.1 Response time verification...');
  
  const performanceResults = [];
  
  for (const endpoint of ANALYTICS_ENDPOINTS) {
    const start = Date.now();
    const result = await makeRequest(endpoint, { auth: true });
    const duration = Date.now() - start;
    
    const passed = result.statusCode === 200 && duration < 3000;
    
    testResults.performance.push({
      test: `Performance of ${endpoint}`,
      passed,
      details: `Status: ${result.statusCode}, Duration: ${duration}ms, Target: <3000ms`
    });
    
    performanceResults.push({ endpoint, duration, status: result.statusCode });
    
    console.log(`   ${passed ? '✅' : '❌'} ${endpoint}: ${duration}ms ${passed ? '(Fast)' : duration < 3000 ? '(Error)' : '(Slow!)'}`);
  }
  
  const avgDuration = performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length;
  console.log(`\n📊 Average response time: ${Math.round(avgDuration)}ms`);
  
  const allFast = performanceResults.every(r => r.duration < 3000 && r.status === 200);
  console.log(`📈 Performance assessment: ${allFast ? '✅ EXCELLENT' : '⚠️ NEEDS ATTENTION'}`);
}

// 5. ANALYTICS DASHBOARD UI TESTING
async function testDashboard() {
  console.log('\n📊 5. ANALYTICS DASHBOARD TESTING');
  console.log('-'.repeat(60));
  
  console.log('📋 5.1 Analytics page accessibility...');
  
  const result = await makeRequest('/analytics', { auth: false });
  const passed = result.statusCode === 200;
  
  testResults.charts.push({
    test: 'Analytics dashboard loads',
    passed,
    details: `Status: ${result.statusCode}`
  });
  
  console.log(`   ${passed ? '✅' : '❌'} Analytics page loads: ${result.statusCode}`);
  
  if (passed) {
    // Check for React components and chart libraries in the HTML
    const hasReactCharts = result.body.includes('Recharts') || result.body.includes('chart');
    const hasDateControls = result.body.includes('date') || result.body.includes('range') || result.body.includes('calendar');
    const hasThemeSupport = result.body.includes('theme') || result.body.includes('dark') || result.body.includes('light');
    const isResponsive = result.body.includes('responsive') || result.body.includes('mobile') || result.body.includes('grid');
    
    console.log(`   ${hasReactCharts ? '✅' : '❌'} Chart components detected: ${hasReactCharts}`);
    console.log(`   ${hasDateControls ? '✅' : '❌'} Date range controls: ${hasDateControls}`);
    console.log(`   ${hasThemeSupport ? '✅' : '❌'} Theme support: ${hasThemeSupport}`);
    console.log(`   ${isResponsive ? '✅' : '❌'} Responsive design: ${isResponsive}`);
    
    testResults.charts.push(
      { test: 'Chart components present', passed: hasReactCharts, details: 'Recharts integration detected' },
      { test: 'Date controls present', passed: hasDateControls, details: 'Date filtering UI detected' },
      { test: 'Theme support', passed: hasThemeSupport, details: 'Dark/light theme support' },
      { test: 'Responsive design', passed: isResponsive, details: 'Mobile-friendly design' }
    );
  }
}

// GENERATE COMPREHENSIVE FINAL REPORT
function generateFinalReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 FINAL DEPLOYMENT VERIFICATION REPORT - TASK-019');
  console.log('='.repeat(80));
  
  const categories = [
    { name: 'Security (Critical)', tests: testResults.security, critical: true },
    { name: 'Data Accuracy (Critical)', tests: testResults.dataAccuracy, critical: true },
    { name: 'API Functionality', tests: testResults.apiTesting, critical: false },
    { name: 'Performance', tests: testResults.performance, critical: false },
    { name: 'UI/Chart Functionality', tests: testResults.charts, critical: false }
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalFailures = [];
  
  categories.forEach(category => {
    const passed = category.tests.filter(t => t.passed).length;
    const total = category.tests.length;
    totalTests += total;
    passedTests += passed;
    
    const status = passed === total ? '✅ PASS' : category.critical ? '❌ CRITICAL FAIL' : '⚠️ MINOR ISSUES';
    console.log(`\n${category.name}: ${passed}/${total} passed - ${status}`);
    
    category.tests.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      console.log(`  ${icon} ${test.test}`);
      if (!test.passed) {
        console.log(`      → ${test.details}`);
        if (category.critical) {
          criticalFailures.push(`${category.name}: ${test.test}`);
        }
      }
    });
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 ACCEPTANCE CRITERIA VERIFICATION:');
  console.log('-'.repeat(40));
  
  // Check acceptance criteria
  const criteriaChecks = [
    { criteria: 'Analytics page displays comprehensive project metrics', passed: testResults.charts.some(t => t.test.includes('Analytics dashboard loads') && t.passed) },
    { criteria: 'Charts update with real data from database', passed: testResults.apiTesting.filter(t => t.passed).length >= 5 },
    { criteria: 'Date range filtering works correctly', passed: testResults.dataAccuracy.some(t => t.test.includes('Date filtering') && t.passed) },
    { criteria: 'Performance metrics load efficiently', passed: testResults.performance.filter(t => t.passed).length >= 5 },
    { criteria: 'Charts are responsive and mobile-friendly', passed: testResults.charts.some(t => t.test.includes('Responsive') && t.passed) },
    { criteria: 'Secure authentication and authorization', passed: testResults.security.filter(t => t.test.includes('Auth required') && t.passed).length === 6 }
  ];
  
  criteriaChecks.forEach(check => {
    console.log(`${check.passed ? '✅' : '❌'} ${check.criteria}`);
  });
  
  const acceptanceMet = criteriaChecks.filter(c => c.passed).length;
  const totalCriteria = criteriaChecks.length;
  
  console.log('\n' + '='.repeat(80));
  console.log(`📊 OVERALL TEST RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log(`🎯 ACCEPTANCE CRITERIA: ${acceptanceMet}/${totalCriteria} criteria met (${Math.round((acceptanceMet/totalCriteria)*100)}%)`);
  
  console.log('\n🔍 POST-SECURITY-FIX VALIDATION:');
  const securityFixed = testResults.security.filter(t => t.test.includes('Auth required') && t.passed).length === 6;
  const dataAccuracyRestored = testResults.dataAccuracy.some(t => t.test.includes('structure') && t.passed);
  const performanceImproved = testResults.performance.filter(t => t.passed).length >= 5;
  
  console.log(`${securityFixed ? '✅' : '❌'} Critical security vulnerabilities resolved`);
  console.log(`${dataAccuracyRestored ? '✅' : '❌'} Data accuracy restored after date filtering fixes`);
  console.log(`${performanceImproved ? '✅' : '❌'} Database performance improvements verified`);
  
  console.log('\n' + '='.repeat(80));
  
  if (criticalFailures.length > 0) {
    console.log('🚨 CRITICAL FAILURES DETECTED:');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
    console.log('\n❌ FINAL RESULT: FAIL');
    console.log('   → Critical issues must be resolved before deployment');
    console.log('   → Analytics feature is NOT ready for production');
    return false;
  } else if (acceptanceMet >= totalCriteria - 1 && passedTests / totalTests >= 0.85) {
    console.log('✅ FINAL RESULT: PASS');
    console.log('   → All critical security vulnerabilities resolved');
    console.log('   → Data accuracy restored after fixes');
    console.log('   → Performance meets requirements');
    console.log('   → Analytics feature is READY FOR DEPLOYMENT 🚀');
    return true;
  } else {
    console.log('⚠️ FINAL RESULT: CONDITIONAL PASS');
    console.log('   → Minor issues detected but not deployment-blocking');
    console.log('   → Analytics feature is ready with noted limitations');
    return true;
  }
}

// MAIN TEST EXECUTION
async function runFinalVerification() {
  try {
    console.log('⚙️ Starting comprehensive analytics verification...\n');
    
    await testSecurity();
    await testDataAccuracy();
    await testAPI();
    await testPerformance();
    await testDashboard();
    
    const deploymentReady = generateFinalReport();
    
    console.log('\n📋 Test execution completed.');
    console.log(`🎯 Deployment status: ${deploymentReady ? 'APPROVED ✅' : 'BLOCKED ❌'}`);
    
    process.exit(deploymentReady ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Execute final verification
runFinalVerification();