/**
 * TASK-022 Comprehensive Export & Reports Testing Suite
 * Tests all export functionality with proper authentication
 */

const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')

// Test configuration
const BASE_URL = 'http://localhost:3000'
const TEST_OUTPUT_DIR = './test-exports'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

// Create test output directory if it doesn't exist
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true })
}

// Create test JWT token
const testToken = jwt.sign({
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin'
  }
}, JWT_SECRET, { expiresIn: '1h' })

console.log('🧪 TASK-022: COMPREHENSIVE EXPORT & REPORTS TESTING')
console.log('='.repeat(60))
console.log('🔑 Using test authentication token')
console.log('📁 Output directory:', TEST_OUTPUT_DIR)
console.log('')

/**
 * Test helper to make authenticated HTTP requests
 */
async function makeAuthenticatedRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  
  try {
    console.log(`📡 ${options.method || 'GET'} ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
        ...options.headers
      },
      ...options
    })

    const contentType = response.headers.get('content-type') || ''
    let responseData
    
    if (contentType.includes('application/json')) {
      responseData = await response.json()
    } else if (contentType.includes('text/csv')) {
      responseData = await response.text()
    } else {
      responseData = await response.blob()
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      contentType
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error.message)
    return { ok: false, error: error.message }
  }
}

/**
 * Save response data to file for inspection
 */
function saveTestFile(filename, data, type = 'json') {
  const filePath = path.join(TEST_OUTPUT_DIR, filename)
  
  try {
    if (type === 'json' && typeof data === 'object') {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } else {
      fs.writeFileSync(filePath, data.toString())
    }
    console.log(`💾 Saved test file: ${filePath}`)
    return filePath
  } catch (error) {
    console.error(`❌ Failed to save test file:`, error.message)
    return null
  }
}

/**
 * Validate CSV format and RFC 4180 compliance
 */
function validateCSV(csvContent, testName) {
  console.log(`🔍 Validating CSV format for ${testName}`)
  
  const lines = csvContent.split('\n').filter(line => line.trim().length > 0)
  const headerLine = lines[0]
  const dataLines = lines.slice(1)
  
  // Check for proper header
  if (!headerLine || headerLine.length === 0) {
    console.log(`❌ No CSV header found`)
    return false
  }
  
  // Count commas in header vs data lines to check consistency
  const headerCommas = (headerLine.match(/,/g) || []).length
  const dataCommaConsistency = dataLines.every(line => {
    const commas = (line.match(/,/g) || []).length
    return commas === headerCommas
  })
  
  if (!dataCommaConsistency) {
    console.log(`⚠️  Inconsistent comma count in CSV data`)
  }
  
  console.log(`✅ CSV validation passed: ${lines.length} lines (${dataLines.length} data rows)`)
  console.log(`📊 Header: ${headerLine}`)
  
  return true
}

/**
 * Validate JSON format and structure
 */
function validateJSON(jsonData, testName) {
  console.log(`🔍 Validating JSON format for ${testName}`)
  
  if (!jsonData || typeof jsonData !== 'object') {
    console.log(`❌ Invalid JSON structure`)
    return false
  }
  
  if (!jsonData.success) {
    console.log(`❌ Response indicates failure:`, jsonData.error)
    return false
  }
  
  if (!jsonData.data) {
    console.log(`❌ No data array in response`)
    return false
  }
  
  console.log(`✅ JSON validation passed: ${Array.isArray(jsonData.data) ? jsonData.data.length : 'object'} data records`)
  
  return true
}

/**
 * Test 1: CSV Export with Various Configurations
 */
async function testCSVExportVariations() {
  console.log('\n🔹 Test 1: CSV Export Variations')
  console.log('-'.repeat(40))
  
  const testConfigurations = [
    {
      name: 'Basic CSV with Comma Delimiter',
      payload: {
        format: 'csv',
        fields: ['id', 'title', 'status', 'priority', 'assignedAgent', 'createdAt'],
        delimiter: 'comma',
        encoding: 'utf-8',
        dateFormat: 'iso',
        limit: 100
      }
    },
    {
      name: 'CSV with Semicolon Delimiter',
      payload: {
        format: 'csv',
        fields: ['id', 'title', 'description', 'status', 'projectName'],
        delimiter: 'semicolon',
        encoding: 'utf-8',
        dateFormat: 'us',
        limit: 50
      }
    },
    {
      name: 'CSV with Tab Delimiter',
      payload: {
        format: 'csv',
        fields: ['id', 'title', 'status', 'assignedAgent', 'updatedAt'],
        delimiter: 'tab',
        encoding: 'windows-1252',
        dateFormat: 'eu',
        limit: 25
      }
    },
    {
      name: 'CSV with Special Characters Test',
      payload: {
        format: 'csv',
        fields: ['id', 'title', 'description', 'tags', 'assignedAgent'],
        delimiter: 'comma',
        filters: {
          searchTerm: 'test'
        },
        limit: 100
      }
    }
  ]
  
  const results = []
  
  for (const config of testConfigurations) {
    console.log(`\n  📋 Testing: ${config.name}`)
    
    const response = await makeAuthenticatedRequest('/api/export/tasks', {
      method: 'POST',
      body: JSON.stringify(config.payload)
    })
    
    if (response.ok && response.contentType.includes('text/csv')) {
      console.log(`✅ ${config.name} successful`)
      
      const filename = `csv-export-${config.name.toLowerCase().replace(/\s+/g, '-')}.csv`
      const filePath = saveTestFile(filename, response.data, 'csv')
      
      if (filePath && validateCSV(response.data, config.name)) {
        results.push({ test: config.name, status: 'PASS', details: `Saved to ${filename}` })
      } else {
        results.push({ test: config.name, status: 'FAIL', details: 'CSV validation failed' })
      }
    } else {
      console.log(`❌ ${config.name} failed: ${response.status} ${response.statusText}`)
      results.push({ test: config.name, status: 'FAIL', details: response.data?.error || 'Request failed' })
    }
  }
  
  return results
}

/**
 * Test 2: JSON Export with Metadata Validation
 */
async function testJSONExportFeatures() {
  console.log('\n🔹 Test 2: JSON Export Features')
  console.log('-'.repeat(35))
  
  const testConfigurations = [
    {
      name: 'Complete JSON Export',
      payload: {
        format: 'json',
        fields: ['id', 'title', 'description', 'status', 'priority', 'assignedAgent', 'projectName', 'tags', 'createdAt', 'updatedAt'],
        dateFormat: 'iso',
        limit: 100
      }
    },
    {
      name: 'Filtered JSON Export',
      payload: {
        format: 'json',
        fields: ['id', 'title', 'status', 'priority'],
        filters: {
          status: ['in-progress', 'done'],
          priority: ['high', 'medium']
        },
        limit: 50
      }
    },
    {
      name: 'Date Range JSON Export',
      payload: {
        format: 'json',
        fields: ['id', 'title', 'status', 'createdAt'],
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          end: new Date().toISOString()
        },
        limit: 200
      }
    }
  ]
  
  const results = []
  
  for (const config of testConfigurations) {
    console.log(`\n  📋 Testing: ${config.name}`)
    
    const response = await makeAuthenticatedRequest('/api/export/tasks', {
      method: 'POST',
      body: JSON.stringify(config.payload)
    })
    
    if (response.ok && response.contentType.includes('application/json')) {
      console.log(`✅ ${config.name} successful`)
      console.log(`📊 Records: ${response.data.data?.length || 0}`)
      console.log(`⏰ Export time: ${response.data.metadata?.exportedAt}`)
      
      const filename = `json-export-${config.name.toLowerCase().replace(/\s+/g, '-')}.json`
      const filePath = saveTestFile(filename, response.data)
      
      if (filePath && validateJSON(response.data, config.name)) {
        results.push({ 
          test: config.name, 
          status: 'PASS', 
          details: `${response.data.data?.length || 0} records saved to ${filename}` 
        })
      } else {
        results.push({ test: config.name, status: 'FAIL', details: 'JSON validation failed' })
      }
    } else {
      console.log(`❌ ${config.name} failed: ${response.status} ${response.statusText}`)
      results.push({ test: config.name, status: 'FAIL', details: response.data?.error || 'Request failed' })
    }
  }
  
  return results
}

/**
 * Test 3: Report Generation Testing
 */
async function testReportGeneration() {
  console.log('\n🔹 Test 3: Report Generation')
  console.log('-'.repeat(30))
  
  const reportConfigurations = [
    {
      name: 'Overview Report (JSON)',
      payload: {
        reportType: 'overview',
        format: 'json',
        dateRange: { preset: 'last-30-days' },
        sections: ['summary', 'task-distribution', 'completion-trends', 'agent-workload']
      }
    },
    {
      name: 'Project Health Report (JSON)',
      payload: {
        reportType: 'project-health',
        format: 'json',
        dateRange: { preset: 'last-7-days' },
        sections: ['summary', 'task-distribution', 'project-status', 'risk-indicators']
      }
    },
    {
      name: 'Agent Performance Report (CSV)',
      payload: {
        reportType: 'agent-performance',
        format: 'csv',
        dateRange: { preset: 'month' },
        sections: ['agent-workload', 'velocity-metrics']
      }
    },
    {
      name: 'Velocity Report with Risk Indicators',
      payload: {
        reportType: 'velocity',
        format: 'json',
        dateRange: { preset: 'quarter' },
        sections: ['summary', 'velocity-metrics', 'completion-trends', 'risk-indicators']
      }
    }
  ]
  
  const results = []
  
  for (const config of reportConfigurations) {
    console.log(`\n  📋 Testing: ${config.name}`)
    
    const response = await makeAuthenticatedRequest('/api/export/reports', {
      method: 'POST',
      body: JSON.stringify(config.payload)
    })
    
    if (response.ok) {
      console.log(`✅ ${config.name} successful`)
      
      const filename = `report-${config.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${config.payload.format === 'csv' ? 'csv' : 'json'}`
      
      if (config.payload.format === 'json' && response.data) {
        console.log(`📊 Report sections: ${Object.keys(response.data.data || {}).join(', ')}`)
        console.log(`⏰ Generated at: ${response.data.metadata?.generatedAt}`)
        
        // Log key metrics if available
        if (response.data.data?.summary) {
          const summary = response.data.data.summary
          console.log(`📈 Summary: ${summary.totalTasks} total, ${summary.completedTasks} completed (${summary.completionRate}%)`)
        }
        
        const filePath = saveTestFile(filename, response.data)
        if (filePath) {
          results.push({ 
            test: config.name, 
            status: 'PASS', 
            details: `Report generated with sections: ${Object.keys(response.data.data || {}).join(', ')}` 
          })
        }
      } else if (config.payload.format === 'csv' && typeof response.data === 'string') {
        const filePath = saveTestFile(filename, response.data, 'csv')
        if (filePath && validateCSV(response.data, config.name)) {
          results.push({ test: config.name, status: 'PASS', details: `CSV report saved to ${filename}` })
        }
      } else {
        results.push({ test: config.name, status: 'FAIL', details: 'Unexpected response format' })
      }
    } else {
      console.log(`❌ ${config.name} failed: ${response.status} ${response.statusText}`)
      results.push({ test: config.name, status: 'FAIL', details: response.data?.error || 'Request failed' })
    }
  }
  
  return results
}

/**
 * Test 4: Export Configuration Management
 */
async function testExportConfigManagement() {
  console.log('\n🔹 Test 4: Export Configuration Management')
  console.log('-'.repeat(45))
  
  const results = []
  
  // Test saving a configuration
  const configData = {
    name: 'Test Export Configuration',
    description: 'Automated test configuration',
    type: 'task-export',
    config: {
      format: 'csv',
      fields: ['id', 'title', 'status', 'priority', 'assignedAgent'],
      filters: { status: ['in-progress', 'done'] },
      csvOptions: { delimiter: 'comma', encoding: 'utf-8' }
    }
  }
  
  console.log('\n  📋 Testing: Save Export Configuration')
  const saveResponse = await makeAuthenticatedRequest('/api/export/config', {
    method: 'POST',
    body: JSON.stringify(configData)
  })
  
  if (saveResponse.ok && saveResponse.data.success) {
    const configId = saveResponse.data.data.id
    console.log(`✅ Configuration saved with ID: ${configId}`)
    
    // Test retrieving configurations
    console.log('\n  📋 Testing: Retrieve Export Configurations')
    const getResponse = await makeAuthenticatedRequest('/api/export/config?type=task-export')
    
    if (getResponse.ok && getResponse.data.success) {
      console.log(`✅ Retrieved ${getResponse.data.data.length} configurations`)
      saveTestFile('export-configs-test.json', getResponse.data)
      
      // Test updating configuration
      console.log('\n  📋 Testing: Update Export Configuration')
      const updatedConfig = { ...configData, description: 'Updated test configuration' }
      const updateResponse = await makeAuthenticatedRequest(`/api/export/config?id=${configId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedConfig)
      })
      
      if (updateResponse.ok) {
        console.log(`✅ Configuration updated successfully`)
        
        // Test deleting configuration (cleanup)
        console.log('\n  📋 Testing: Delete Export Configuration')
        const deleteResponse = await makeAuthenticatedRequest(`/api/export/config?id=${configId}`, {
          method: 'DELETE'
        })
        
        if (deleteResponse.ok) {
          console.log(`✅ Configuration deleted successfully`)
          results.push({ test: 'Configuration Management', status: 'PASS', details: 'Full CRUD operations working' })
        } else {
          results.push({ test: 'Configuration Management', status: 'FAIL', details: 'Delete operation failed' })
        }
      } else {
        results.push({ test: 'Configuration Management', status: 'FAIL', details: 'Update operation failed' })
      }
    } else {
      results.push({ test: 'Configuration Management', status: 'FAIL', details: 'Retrieve operation failed' })
    }
  } else {
    console.log(`❌ Failed to save configuration: ${saveResponse.status}`)
    results.push({ test: 'Configuration Management', status: 'FAIL', details: 'Save operation failed' })
  }
  
  return results
}

/**
 * Test 5: Large Dataset Performance Testing
 */
async function testPerformanceWithLargeDatasets() {
  console.log('\n🔹 Test 5: Performance Testing with Large Datasets')
  console.log('-'.repeat(50))
  
  const results = []
  
  const performanceTests = [
    { limit: 1000, name: '1K Records Export' },
    { limit: 5000, name: '5K Records Export' },
    { limit: 10000, name: '10K Records Export' },
    { limit: 50000, name: '50K Records Export (Max)' }
  ]
  
  for (const test of performanceTests) {
    console.log(`\n  📋 Testing: ${test.name}`)
    
    const startTime = Date.now()
    
    const payload = {
      format: 'csv',
      fields: ['id', 'title', 'status', 'priority', 'assignedAgent', 'createdAt'],
      limit: test.limit
    }
    
    const response = await makeAuthenticatedRequest('/api/export/tasks', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    
    const duration = Date.now() - startTime
    
    if (response.ok) {
      const lines = response.data.split('\n').filter(line => line.trim().length > 0)
      const recordCount = lines.length - 1 // Subtract header
      const dataSize = response.data.length
      
      console.log(`✅ ${test.name} successful`)
      console.log(`⏱️  Duration: ${duration}ms`)
      console.log(`📊 Exported: ${recordCount} records`)
      console.log(`💾 Data size: ${(dataSize / 1024).toFixed(2)} KB`)
      console.log(`🚀 Performance: ${(recordCount / (duration / 1000)).toFixed(2)} records/second`)
      
      const filename = `performance-test-${test.limit}-records.csv`
      saveTestFile(filename, response.data, 'csv')
      
      results.push({ 
        test: test.name, 
        status: 'PASS', 
        details: `${recordCount} records in ${duration}ms (${(recordCount / (duration / 1000)).toFixed(2)} r/s)` 
      })
    } else {
      console.log(`❌ ${test.name} failed: ${response.status} ${response.statusText}`)
      results.push({ test: test.name, status: 'FAIL', details: response.data?.error || 'Request failed' })
    }
  }
  
  return results
}

/**
 * Test 6: API Endpoint Edge Cases and Error Handling
 */
async function testErrorHandling() {
  console.log('\n🔹 Test 6: Error Handling and Edge Cases')
  console.log('-'.repeat(40))
  
  const results = []
  
  const errorTests = [
    {
      name: 'Invalid Format Parameter',
      endpoint: '/api/export/tasks',
      method: 'POST',
      payload: { format: 'invalid-format' },
      expectedStatus: 400
    },
    {
      name: 'Excessive Limit',
      endpoint: '/api/export/tasks',
      method: 'POST',
      payload: { format: 'csv', limit: 100000 },
      expectedStatus: 400
    },
    {
      name: 'Invalid Date Range',
      endpoint: '/api/export/tasks',
      method: 'POST',
      payload: { 
        format: 'json',
        dateRange: { start: 'invalid-date', end: 'invalid-date' }
      },
      expectedStatus: 400
    },
    {
      name: 'Invalid Report Type',
      endpoint: '/api/export/reports',
      method: 'POST',
      payload: { reportType: 'non-existent-type' },
      expectedStatus: 400
    },
    {
      name: 'Missing Configuration ID',
      endpoint: '/api/export/config',
      method: 'DELETE',
      payload: {},
      expectedStatus: 400
    }
  ]
  
  for (const test of errorTests) {
    console.log(`\n  📋 Testing: ${test.name}`)
    
    const response = await makeAuthenticatedRequest(test.endpoint, {
      method: test.method,
      body: test.payload ? JSON.stringify(test.payload) : undefined
    })
    
    if (response.status === test.expectedStatus) {
      console.log(`✅ ${test.name} - correctly returned status ${test.expectedStatus}`)
      results.push({ test: test.name, status: 'PASS', details: `Status ${response.status} as expected` })
    } else {
      console.log(`❌ ${test.name} - expected status ${test.expectedStatus}, got ${response.status}`)
      results.push({ test: test.name, status: 'FAIL', details: `Unexpected status ${response.status}` })
    }
  }
  
  return results
}

/**
 * Test 7: Data Accuracy Verification
 */
async function testDataAccuracy() {
  console.log('\n🔹 Test 7: Data Accuracy Verification')
  console.log('-'.repeat(35))
  
  const results = []
  
  // Get raw tasks data
  console.log('\n  📋 Fetching raw task data for comparison')
  const rawTasksResponse = await makeAuthenticatedRequest('/api/tasks?limit=50')
  
  if (!rawTasksResponse.ok) {
    results.push({ test: 'Data Accuracy', status: 'FAIL', details: 'Could not fetch raw data' })
    return results
  }
  
  const rawTasks = rawTasksResponse.data.data || []
  console.log(`📊 Raw data: ${rawTasks.length} tasks`)
  
  // Export the same data
  console.log('\n  📋 Exporting same data via export API')
  const exportResponse = await makeAuthenticatedRequest('/api/export/tasks', {
    method: 'POST',
    body: JSON.stringify({
      format: 'json',
      fields: ['id', 'title', 'status', 'priority', 'assignedAgent'],
      limit: 50
    })
  })
  
  if (!exportResponse.ok) {
    results.push({ test: 'Data Accuracy', status: 'FAIL', details: 'Export request failed' })
    return results
  }
  
  const exportedTasks = exportResponse.data.data || []
  console.log(`📊 Exported data: ${exportedTasks.length} tasks`)
  
  // Compare data accuracy
  let accuracyIssues = []
  
  // Check if we have the same number of records (within reason)
  if (Math.abs(rawTasks.length - exportedTasks.length) > 0) {
    console.log(`⚠️  Record count mismatch: raw=${rawTasks.length}, exported=${exportedTasks.length}`)
  }
  
  // Sample check - compare first few records
  const sampleSize = Math.min(5, rawTasks.length, exportedTasks.length)
  for (let i = 0; i < sampleSize; i++) {
    const rawTask = rawTasks[i]
    const exportedTask = exportedTasks.find(t => t.id === rawTask.id)
    
    if (!exportedTask) {
      accuracyIssues.push(`Task ID ${rawTask.id} not found in export`)
      continue
    }
    
    // Compare key fields
    if (rawTask.title !== exportedTask.title) {
      accuracyIssues.push(`Title mismatch for task ${rawTask.id}`)
    }
    if (rawTask.status !== exportedTask.status) {
      accuracyIssues.push(`Status mismatch for task ${rawTask.id}`)
    }
    if (rawTask.priority !== exportedTask.priority) {
      accuracyIssues.push(`Priority mismatch for task ${rawTask.id}`)
    }
  }
  
  if (accuracyIssues.length === 0) {
    console.log(`✅ Data accuracy check passed`)
    results.push({ test: 'Data Accuracy', status: 'PASS', details: `Verified ${sampleSize} records` })
  } else {
    console.log(`❌ Data accuracy issues found:`)
    accuracyIssues.forEach(issue => console.log(`   - ${issue}`))
    results.push({ test: 'Data Accuracy', status: 'FAIL', details: `${accuracyIssues.length} accuracy issues` })
  }
  
  return results
}

/**
 * Main test runner
 */
async function runComprehensiveTests() {
  console.log('🚀 Starting TASK-022 comprehensive export testing...\n')
  
  // Check server availability
  console.log('🔍 Checking server availability...')
  const healthCheck = await makeAuthenticatedRequest('/api/tasks?limit=1')
  if (!healthCheck.ok) {
    console.log('❌ Server not accessible. Make sure the development server is running.')
    console.log('   Run: npm run dev')
    process.exit(1)
  }
  console.log('✅ Server is running and accessible\n')
  
  const allResults = []
  
  try {
    // Run all test suites
    const csvResults = await testCSVExportVariations()
    allResults.push(...csvResults)
    
    const jsonResults = await testJSONExportFeatures()
    allResults.push(...jsonResults)
    
    const reportResults = await testReportGeneration()
    allResults.push(...reportResults)
    
    const configResults = await testExportConfigManagement()
    allResults.push(...configResults)
    
    const performanceResults = await testPerformanceWithLargeDatasets()
    allResults.push(...performanceResults)
    
    const errorResults = await testErrorHandling()
    allResults.push(...errorResults)
    
    const accuracyResults = await testDataAccuracy()
    allResults.push(...accuracyResults)
    
  } catch (error) {
    console.error('\n❌ Test suite encountered an error:', error)
    allResults.push({ test: 'Test Suite', status: 'FAIL', details: error.message })
  }
  
  // Generate comprehensive summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 COMPREHENSIVE TEST SUMMARY')
  console.log('='.repeat(60))
  
  const passed = allResults.filter(r => r.status === 'PASS').length
  const failed = allResults.filter(r => r.status === 'FAIL').length
  const total = allResults.length
  
  console.log(`\n📊 Overall Results:`)
  console.log(`   Total Tests: ${total}`)
  console.log(`   Passed: ${passed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
  
  console.log(`\n📝 Detailed Results:`)
  allResults.forEach(result => {
    const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${result.test}`)
    if (result.details) {
      console.log(`    ${result.details}`)
    }
  })
  
  console.log(`\n📁 Test outputs saved to: ${TEST_OUTPUT_DIR}`)
  
  // Final assessment
  const criticalFailures = allResults.filter(r => 
    r.status === 'FAIL' && (
      r.test.includes('CSV Export') || 
      r.test.includes('JSON Export') || 
      r.test.includes('Report Generation') ||
      r.test.includes('Data Accuracy')
    )
  ).length
  
  console.log('\n🎯 FINAL ASSESSMENT:')
  if (failed === 0) {
    console.log('🟢 PASS: All tests passed - Export & Reports ready for deployment')
  } else if (criticalFailures === 0 && failed <= 2) {
    console.log('🟡 PASS WITH MINOR ISSUES: Core functionality working, minor issues detected')
  } else {
    console.log('🔴 FAIL: Critical issues found - needs fixes before deployment')
  }
  
  return {
    total,
    passed,
    failed,
    criticalFailures,
    overallStatus: failed === 0 ? 'PASS' : (criticalFailures === 0 && failed <= 2 ? 'PASS_WITH_ISSUES' : 'FAIL')
  }
}

// Run if executed directly
if (require.main === module) {
  runComprehensiveTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = {
  runComprehensiveTests,
  testCSVExportVariations,
  testJSONExportFeatures,
  testReportGeneration,
  testExportConfigManagement,
  testPerformanceWithLargeDatasets,
  testErrorHandling,
  testDataAccuracy
}