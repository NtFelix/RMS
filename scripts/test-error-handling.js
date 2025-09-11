#!/usr/bin/env node

/**
 * Demonstration script for template error handling system
 * Shows how the error handling works in various scenarios
 */

const { TemplatesModalErrorHandler, TemplatesModalErrorType } = require('../lib/template-error-handler')

console.log('🧪 Testing Template Error Handling System\n')

// Test 1: Load Error
console.log('1. Testing Load Error:')
try {
  TemplatesModalErrorHandler.handleLoadError(new Error('Network timeout'), { userId: 'test-user' })
  console.log('✅ Load error handled successfully')
} catch (error) {
  console.log('❌ Load error handling failed:', error.message)
}

// Test 2: Delete Error with Retry
console.log('\n2. Testing Delete Error with Retry:')
const retryCallback = () => console.log('   🔄 Retry callback executed')
try {
  TemplatesModalErrorHandler.handleDeleteError(
    new Error('Delete operation failed'), 
    'Test Template',
    retryCallback
  )
  console.log('✅ Delete error handled successfully')
} catch (error) {
  console.log('❌ Delete error handling failed:', error.message)
}

// Test 3: Search Error
console.log('\n3. Testing Search Error:')
try {
  TemplatesModalErrorHandler.handleSearchError(new Error('Search index corrupted'), 'test query')
  console.log('✅ Search error handled successfully')
} catch (error) {
  console.log('❌ Search error handling failed:', error.message)
}

// Test 4: Network Error
console.log('\n4. Testing Network Error:')
try {
  TemplatesModalErrorHandler.handleNetworkError(new Error('Connection refused'), 'load templates')
  console.log('✅ Network error handled successfully')
} catch (error) {
  console.log('❌ Network error handling failed:', error.message)
}

// Test 5: Permission Error
console.log('\n5. Testing Permission Error:')
try {
  TemplatesModalErrorHandler.handlePermissionError(new Error('Access denied'), 'delete template')
  console.log('✅ Permission error handled successfully')
} catch (error) {
  console.log('❌ Permission error handling failed:', error.message)
}

// Test 6: Generic Error with Auto-Detection
console.log('\n6. Testing Generic Error with Auto-Detection:')
try {
  TemplatesModalErrorHandler.handleGenericError(
    new Error('network connection failed'), 
    'load user templates',
    { userId: 'test-user', timestamp: new Date().toISOString() }
  )
  console.log('✅ Generic error handled successfully (should detect as network error)')
} catch (error) {
  console.log('❌ Generic error handling failed:', error.message)
}

// Test 7: Retry Mechanism
console.log('\n7. Testing Retry Mechanism:')
let attempts = 0
const testOperation = async () => {
  attempts++
  console.log(`   Attempt ${attempts}`)
  if (attempts < 3) {
    throw new Error(`Attempt ${attempts} failed`)
  }
  return 'Success!'
}

const retryOperation = TemplatesModalErrorHandler.createRetryMechanism(testOperation, 3, 100)

retryOperation()
  .then(result => {
    console.log('✅ Retry mechanism succeeded:', result)
    console.log(`   Total attempts: ${attempts}`)
  })
  .catch(error => {
    console.log('❌ Retry mechanism failed:', error.message)
  })
  .finally(() => {
    // Test 8: Error Log
    console.log('\n8. Testing Error Log:')
    const errorLog = TemplatesModalErrorHandler.getErrorLog()
    console.log(`✅ Error log contains ${errorLog.length} entries`)
    
    if (errorLog.length > 0) {
      console.log('   Recent errors:')
      errorLog.slice(-3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.type}: ${error.message}`)
      })
    }
    
    // Test 9: Clear Error Log
    console.log('\n9. Testing Error Log Clearing:')
    TemplatesModalErrorHandler.clearErrorLog()
    const clearedLog = TemplatesModalErrorHandler.getErrorLog()
    console.log(`✅ Error log cleared, now contains ${clearedLog.length} entries`)
    
    console.log('\n🎉 All error handling tests completed!')
    console.log('\nNote: In a real application, these errors would also trigger toast notifications')
    console.log('and be sent to monitoring services in production.')
  })