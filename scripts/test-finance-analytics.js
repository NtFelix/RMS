// Test script for Finance Analytics API
// Run with: node scripts/test-finance-analytics.js

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testAnalyticsAPI() {
  console.log('🧪 Testing Finance Analytics API...\n');

  const currentYear = new Date().getFullYear();
  
  const tests = [
    {
      name: 'Summary Data',
      url: `${BASE_URL}/api/finanzen/analytics?action=summary&year=${currentYear}`,
      expectedFields: ['year', 'totalIncome', 'totalExpenses', 'averageMonthlyIncome', 'monthlyData']
    },
    {
      name: 'Chart Data',
      url: `${BASE_URL}/api/finanzen/analytics?action=chart-data&year=${currentYear}`,
      expectedFields: ['monthlyData']
    },
    {
      name: 'Filtered Summary',
      url: `${BASE_URL}/api/finanzen/analytics?action=filtered-summary&selectedType=Alle Transaktionen`,
      expectedFields: ['totalBalance', 'totalIncome', 'totalExpenses']
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      
      const response = await fetch(test.url);
      const data = await response.json();
      
      if (!response.ok) {
        console.log(`❌ ${test.name}: HTTP ${response.status}`);
        console.log(`   Error: ${data.error || 'Unknown error'}`);
        continue;
      }
      
      // Check if expected fields are present
      const missingFields = test.expectedFields.filter(field => !(field in data));
      
      if (missingFields.length > 0) {
        console.log(`⚠️  ${test.name}: Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log(`✅ ${test.name}: All expected fields present`);
      }
      
      // Log some sample data
      console.log(`   Sample data: ${JSON.stringify(data).substring(0, 100)}...`);
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🏁 Testing complete!');
  console.log('\nIf you see errors, make sure:');
  console.log('1. Your development server is running (npm run dev)');
  console.log('2. You have run the SQL setup in your Supabase dashboard');
  console.log('3. You are authenticated in your application');
}

// Run the tests
testAnalyticsAPI().catch(console.error);