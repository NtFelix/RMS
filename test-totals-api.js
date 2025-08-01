// Simple test script to verify the totals API endpoint
// Run with: node test-totals-api.js

const testEndpoint = async (url, description) => {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📡 URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(data, null, 2));
    
    if (response.ok && data.totalBalance !== undefined) {
      console.log(`✅ Test passed: API returned expected structure`);
    } else {
      console.log(`❌ Test failed: Unexpected response structure`);
    }
  } catch (error) {
    console.log(`❌ Test failed with error:`, error.message);
  }
};

const runTests = async () => {
  const baseUrl = 'http://localhost:3000/api/finanzen/totals';
  
  console.log('🚀 Starting API Tests for /api/finanzen/totals');
  console.log('⚠️  Make sure the development server is running (npm run dev)');
  
  // Test 1: Basic endpoint without filters
  await testEndpoint(baseUrl, 'Basic totals without filters');
  
  // Test 2: With year filter
  await testEndpoint(`${baseUrl}?year=2024`, 'Totals with year filter (2024)');
  
  // Test 3: With type filter
  await testEndpoint(`${baseUrl}?type=income`, 'Totals with type filter (income)');
  
  // Test 4: With search filter
  await testEndpoint(`${baseUrl}?search=miete`, 'Totals with search filter (miete)');
  
  // Test 5: Multiple filters
  await testEndpoint(`${baseUrl}?year=2024&type=income`, 'Totals with multiple filters');
  
  console.log('\n🏁 Tests completed!');
  console.log('💡 If all tests passed, the API endpoint is working correctly.');
};

runTests();