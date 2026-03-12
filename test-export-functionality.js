/**
 * Test script for TASK-022 Export & Reports functionality
 * This script tests the comprehensive export and reporting system
 */

const fs = require('fs')
const path = require('path')

// Test configuration
const BASE_URL = 'http://localhost:3000'
const TEST_OUTPUT_DIR = './test-exports'

// Create test output directory if it doesn't exist
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true })
}

console.log('🧪 TASK-022 Export & Reports Functionality Test')
console.log('='.repeat(60))

/**
 * Test helper to make HTTP requests
 */
async function makeRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  
  try {
    console.log(`📡 ${options.method || 'GET'} ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const isCsv = response.headers.get('content-type')?.includes('text/csv')
    
    let responseData
    if (isJson) {
      responseData = await response.json()
    } else if (isCsv) {
      responseData = await response.text()
    } else {
      responseData = await response.blob()
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
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
    if (type === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } else {
      fs.writeFileSync(filePath, data)
    }
    console.log(`💾 Saved test file: ${filePath}`)
  } catch (error) {
    console.error(`❌ Failed to save test file:`, error.message)
  }
}

/**
 * Test 1: Task Export API (CSV format)
 */
async function testTaskExportCSV() {
  console.log('\n🔹 Test 1: Task Export (CSV)')
  console.log('-'.repeat(30))
  
  const payload = {
    format: 'csv',
    fields: ['id', 'title', 'status', 'priority', 'assignedAgent', 'projectName', 'createdAt'],
    filters: {
      status: ['backlog', 'in-progress', 'done']
    },
    csvOptions: {
      delimiter: 'comma',
      encoding: 'utf-8',
      dateFormat: 'iso'
    },
    limit: 100
  }
  
  const response = await makeRequest('/api/export/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  
  if (response.ok) {
    console.log('✅ Task CSV export successful')
    console.log(`📊 Content-Type: ${response.headers['content-type']}`)
    console.log(`📁 Content-Disposition: ${response.headers['content-disposition']}`)
    
    if (typeof response.data === 'string') {
      const lines = response.data.split('\n')
      console.log(`📝 CSV has ${lines.length} lines`)
      console.log(`🎯 Header row: ${lines[0]}`)
      
      saveTestFile('task-export-test.csv', response.data, 'csv')
    }
  } else {
    console.log(`❌ Task CSV export failed: ${response.status} ${response.statusText}`)
    if (response.data) console.log(response.data)
  }
  
  return response.ok
}

/**
 * Test 2: Task Export API (JSON format)
 */
async function testTaskExportJSON() {
  console.log('\n🔹 Test 2: Task Export (JSON)')
  console.log('-'.repeat(30))
  
  const payload = {
    format: 'json',
    fields: ['id', 'title', 'description', 'status', 'priority', 'assignedAgent', 'tags', 'createdAt'],
    dateRange: {
      preset: 'last-30-days'
    },
    limit: 50
  }
  
  const response = await makeRequest('/api/export/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  
  if (response.ok && response.data) {
    console.log('✅ Task JSON export successful')
    console.log(`📊 Records exported: ${response.data.data?.length || 0}`)
    console.log(`⏰ Export time: ${response.data.metadata?.exportedAt}`)
    
    saveTestFile('task-export-test.json', response.data)
  } else {
    console.log(`❌ Task JSON export failed: ${response.status} ${response.statusText}`)
    if (response.data) console.log(response.data)
  }
  
  return response.ok
}

/**
 * Test 3: Report Generation (Overview Report)
 */
async function testOverviewReport() {
  console.log('\n🔹 Test 3: Overview Report Generation')
  console.log('-'.repeat(40))
  
  const payload = {
    reportType: 'overview',
    format: 'json',
    dateRange: {
      preset: 'last-30-days'
    },
    sections: ['summary', 'task-distribution', 'completion-trends', 'agent-workload'],
    includeCharts: false
  }
  
  const response = await makeRequest('/api/export/reports', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  
  if (response.ok && response.data) {
    console.log('✅ Overview report generation successful')
    console.log(`📊 Report sections: ${Object.keys(response.data.data || {}).join(', ')}`)
    console.log(`⏰ Generated at: ${response.data.metadata?.generatedAt}`)
    
    // Log summary data if available
    if (response.data.data?.summary) {
      const summary = response.data.data.summary
      console.log(`📈 Summary:`)
      console.log(`   - Total tasks: ${summary.totalTasks}`)
      console.log(`   - Completed: ${summary.completedTasks}`)
      console.log(`   - In progress: ${summary.inProgressTasks}`)
      console.log(`   - Completion rate: ${summary.completionRate}%`)
    }
    
    saveTestFile('overview-report-test.json', response.data)
  } else {
    console.log(`❌ Overview report failed: ${response.status} ${response.statusText}`)
    if (response.data) console.log(response.data)
  }
  
  return response.ok
}

/**
 * Test 4: Report Generation (CSV format)
 */
async function testReportCSV() {
  console.log('\n🔹 Test 4: Report Generation (CSV)')
  console.log('-'.repeat(35))
  
  const payload = {
    reportType: 'project-health',
    format: 'csv',
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
      end: new Date().toISOString()
    },
    sections: ['summary', 'task-distribution', 'agent-workload']
  }
  
  const response = await makeRequest('/api/export/reports', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  
  if (response.ok) {
    console.log('✅ Report CSV generation successful')
    console.log(`📊 Content-Type: ${response.headers['content-type']}`)
    
    if (typeof response.data === 'string') {
      const lines = response.data.split('\n')
      console.log(`📝 CSV has ${lines.length} lines`)
      
      saveTestFile('project-health-report-test.csv', response.data, 'csv')
    }
  } else {
    console.log(`❌ Report CSV generation failed: ${response.status} ${response.statusText}`)
    if (response.data) console.log(response.data)
  }
  
  return response.ok
}

/**
 * Test 5: Export Configuration Management
 */
async function testExportConfig() {
  console.log('\n🔹 Test 5: Export Configuration Management')
  console.log('-'.repeat(45))
  
  // Test saving a configuration
  const configData = {
    name: 'Test Export Config',
    description: 'Test configuration for automated testing',
    type: 'task-export',
    config: {
      format: 'csv',
      fields: ['id', 'title', 'status', 'priority'],
      csvOptions: {
        delimiter: 'comma',
        encoding: 'utf-8',
        dateFormat: 'iso'
      }
    }
  }
  
  const saveResponse = await makeRequest('/api/export/config', {
    method: 'POST',
    body: JSON.stringify(configData)
  })
  
  if (saveResponse.ok && saveResponse.data) {
    console.log('✅ Export configuration saved')
    console.log(`📋 Config ID: ${saveResponse.data.data?.id}`)
    
    const configId = saveResponse.data.data?.id
    
    // Test retrieving configurations
    const getResponse = await makeRequest('/api/export/config?type=task-export')
    
    if (getResponse.ok && getResponse.data) {
      console.log(`✅ Retrieved ${getResponse.data.data?.length || 0} configurations`)
      saveTestFile('export-configs-test.json', getResponse.data)
      
      // Clean up - delete the test configuration
      if (configId) {
        const deleteResponse = await makeRequest(`/api/export/config?id=${configId}`, {
          method: 'DELETE'
        })
        
        if (deleteResponse.ok) {
          console.log('✅ Test configuration cleaned up')
        }
      }
    } else {
      console.log(`❌ Failed to retrieve configurations: ${getResponse.status}`)
    }
  } else {
    console.log(`❌ Failed to save configuration: ${saveResponse.status}`)
  }
  
  return saveResponse.ok
}

/**
 * Test 6: Bulk Task Export with Selection
 */
async function testBulkTaskExport() {
  console.log('\n🔹 Test 6: Bulk Task Export')
  console.log('-'.repeat(30))
  
  // First, get some task IDs to use for bulk export
  const tasksResponse = await makeRequest('/api/tasks?limit=10')
  
  if (!tasksResponse.ok) {
    console.log('❌ Failed to get tasks for bulk export test')
    return false
  }
  
  const tasks = tasksResponse.data?.data || []
  const taskIds = tasks.slice(0, 5).map(task => task.id) // Select first 5 tasks
  
  if (taskIds.length === 0) {
    console.log('⚠️  No tasks available for bulk export test')
    return true // Not a failure, just no data
  }
  
  console.log(`📋 Testing bulk export with ${taskIds.length} tasks: [${taskIds.join(', ')}]`)
  
  const payload = {
    format: 'json',
    fields: ['id', 'title', 'status', 'priority', 'assignedAgent'],
    filters: {
      taskIds: taskIds
    }
  }
  
  const response = await makeRequest('/api/export/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  
  if (response.ok && response.data) {
    console.log('✅ Bulk task export successful')
    console.log(`📊 Exported ${response.data.data?.length || 0} of ${taskIds.length} selected tasks`)
    
    saveTestFile('bulk-export-test.json', response.data)
  } else {
    console.log(`❌ Bulk task export failed: ${response.status} ${response.statusText}`)
  }
  
  return response.ok
}

/**
 * Test 7: Export with Filters
 */
async function testExportWithFilters() {
  console.log('\n🔹 Test 7: Export with Advanced Filters')
  console.log('-'.repeat(40))
  
  const payload = {
    format: 'csv',
    fields: ['id', 'title', 'status', 'priority', 'assignedAgent', 'createdAt'],
    filters: {
      status: ['in-progress', 'code-review'],
      priority: ['high', 'urgent'],
      searchTerm: 'implement'
    },
    csvOptions: {
      delimiter: 'semicolon',
      dateFormat: 'us'
    },
    limit: 200
  }
  
  const response = await makeRequest('/api/export/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  
  if (response.ok) {
    console.log('✅ Filtered export successful')
    console.log(`📊 Applied filters: status=[${payload.filters.status.join(',')}], priority=[${payload.filters.priority.join(',')}]`)
    console.log(`🔍 Search term: "${payload.filters.searchTerm}"`)
    
    if (typeof response.data === 'string') {
      const lines = response.data.split('\n')
      console.log(`📝 CSV has ${lines.length - 1} data rows`) // -1 for header
      
      saveTestFile('filtered-export-test.csv', response.data, 'csv')
    }
  } else {
    console.log(`❌ Filtered export failed: ${response.status} ${response.statusText}`)
  }
  
  return response.ok
}

/**
 * Test 8: Large Export Performance
 */
async function testLargeExport() {
  console.log('\n🔹 Test 8: Large Export Performance')
  console.log('-'.repeat(35))
  
  const startTime = Date.now()
  
  const payload = {
    format: 'csv',
    fields: ['id', 'title', 'description', 'status', 'priority', 'assignedAgent', 'projectName', 'tags', 'createdAt', 'updatedAt'],
    limit: 50000 // Test with high limit
  }
  
  const response = await makeRequest('/api/export/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  
  const duration = Date.now() - startTime
  
  if (response.ok) {
    console.log('✅ Large export successful')
    console.log(`⏱️  Duration: ${duration}ms`)
    
    if (typeof response.data === 'string') {
      const lines = response.data.split('\n')
      const dataSize = response.data.length
      console.log(`📊 Exported ${lines.length - 1} records`)
      console.log(`💾 Data size: ${(dataSize / 1024).toFixed(2)} KB`)
      
      saveTestFile('large-export-test.csv', response.data, 'csv')
    }
  } else {
    console.log(`❌ Large export failed: ${response.status} ${response.statusText}`)
  }
  
  return response.ok
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting comprehensive export functionality tests...\n')
  
  const tests = [
    { name: 'Task Export (CSV)', fn: testTaskExportCSV },
    { name: 'Task Export (JSON)', fn: testTaskExportJSON },
    { name: 'Overview Report', fn: testOverviewReport },
    { name: 'Report CSV Export', fn: testReportCSV },
    { name: 'Export Configuration', fn: testExportConfig },
    { name: 'Bulk Task Export', fn: testBulkTaskExport },
    { name: 'Filtered Export', fn: testExportWithFilters },
    { name: 'Large Export Performance', fn: testLargeExport }
  ]
  
  const results = []
  
  for (const test of tests) {
    try {
      const success = await test.fn()
      results.push({ name: test.name, success })
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw an error:`, error.message)
      results.push({ name: test.name, success: false, error: error.message })
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 TEST SUMMARY')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.success).length
  const failed = results.length - passed
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${result.name}`)
    if (result.error) {
      console.log(`    Error: ${result.error}`)
    }
  })
  
  console.log('\n📊 Results:')
  console.log(`   Passed: ${passed}/${results.length}`)
  console.log(`   Failed: ${failed}/${results.length}`)
  console.log(`   Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)
  
  if (passed === results.length) {
    console.log('\n🎉 All tests passed! Export & Reports functionality is working correctly.')
  } else {
    console.log('\n⚠️  Some tests failed. Please check the error messages above.')
  }
  
  console.log(`\n📁 Test outputs saved to: ${TEST_OUTPUT_DIR}`)
}

// Check if we're running this script directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = {
  runAllTests,
  testTaskExportCSV,
  testTaskExportJSON,
  testOverviewReport,
  testReportCSV,
  testExportConfig,
  testBulkTaskExport,
  testExportWithFilters,
  testLargeExport
}