const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const ANALYTICS_ENDPOINTS = [
  '/api/analytics/overview',
  '/api/analytics/velocity',
  '/api/analytics/completion',
  '/api/analytics/agents',
  '/api/analytics/projects',
  '/api/analytics/additional'
];

async function testEndpoint(endpoint) {
  console.log(`\n🔍 Testing ${endpoint}...`);
  
  try {
    // Test without authentication (should return 401)
    const unauthResponse = await fetch(`${BASE_URL}${endpoint}`);
    console.log(`   Unauthenticated: ${unauthResponse.status} ${unauthResponse.statusText}`);
    
    if (unauthResponse.status === 401) {
      console.log('   ✅ Authentication required (as expected)');
    } else {
      console.log('   ❌ Authentication NOT required (security issue!)');
      const body = await unauthResponse.text();
      console.log('   Response:', body.substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.log(`   ❌ Error testing ${endpoint}:`, error.message);
  }
}

async function testAllEndpoints() {
  console.log('🚀 Testing analytics endpoints authentication...\n');
  
  for (const endpoint of ANALYTICS_ENDPOINTS) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n✨ Test completed!');
}

if (require.main === module) {
  testAllEndpoints().catch(console.error);
}

module.exports = { testEndpoint, testAllEndpoints };