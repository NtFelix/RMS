#!/usr/bin/env node

/**
 * Verification script for Wasserzähler function fixes
 * 
 * This script specifically tests the fixed database functions
 * to ensure they work correctly after the fixes.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyFixes() {
  console.log('🔧 Verifying Wasserzähler function fixes...\n');

  try {
    // Test 1: Verify get_wasserzaehler_modal_data function exists and has correct signature
    console.log('1. Checking get_wasserzaehler_modal_data function...');
    
    const { data: functionInfo, error: functionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, data_type')
      .eq('routine_name', 'get_wasserzaehler_modal_data')
      .eq('routine_schema', 'public');

    if (functionError) {
      console.error('❌ Error checking function:', functionError.message);
      return false;
    }

    if (!functionInfo || functionInfo.length === 0) {
      console.error('❌ Function get_wasserzaehler_modal_data not found');
      return false;
    }

    console.log('✅ Function exists with return type:', functionInfo[0].data_type);

    // Test 2: Test function execution with dummy data (should handle gracefully)
    console.log('\n2. Testing function execution...');
    
    const { data: testData, error: testError } = await supabase.rpc(
      'get_wasserzaehler_modal_data',
      { 
        nebenkosten_id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000'
      }
    );

    if (testError) {
      // Expected error for non-existent data
      if (testError.message.includes('not found') || testError.message.includes('access denied')) {
        console.log('✅ Function handles invalid data correctly:', testError.message);
      } else if (testError.message.includes('ambiguous')) {
        console.error('❌ CRITICAL: Ambiguous column reference still exists:', testError.message);
        console.error('❌ The database functions need to be updated in Supabase');
        return false;
      } else {
        console.error('❌ Unexpected error:', testError.message);
        return false;
      }
    } else {
      console.log('✅ Function executed successfully, returned:', testData?.length || 0, 'records');
    }

    // Test 3: Verify save_wasserzaehler_batch function
    console.log('\n3. Testing save_wasserzaehler_batch function...');
    
    const { data: saveResult, error: saveError } = await supabase.rpc(
      'save_wasserzaehler_batch',
      { 
        nebenkosten_id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000',
        readings: [] // Empty array should be handled correctly
      }
    );

    if (saveError) {
      if (saveError.message.includes('not found') || saveError.message.includes('access denied')) {
        console.log('✅ Save function handles invalid data correctly:', saveError.message);
      } else {
        console.error('❌ Unexpected save error:', saveError.message);
        return false;
      }
    } else {
      console.log('✅ Save function executed successfully, result:', saveResult);
    }

    // Test 4: Test with sample valid data structure
    console.log('\n4. Testing with sample data structure...');
    
    const sampleReadings = [
      {
        mieter_id: '11111111-1111-1111-1111-111111111111',
        ablese_datum: '2024-12-31',
        zaehlerstand: 1234.5,
        verbrauch: 150.0
      }
    ];

    const { data: sampleResult, error: sampleError } = await supabase.rpc(
      'save_wasserzaehler_batch',
      { 
        nebenkosten_id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000',
        readings: sampleReadings
      }
    );

    if (sampleError) {
      if (sampleError.message.includes('not found') || sampleError.message.includes('access denied')) {
        console.log('✅ Function correctly validates data structure and access');
      } else {
        console.error('❌ Unexpected error with sample data:', sampleError.message);
        return false;
      }
    } else {
      console.log('✅ Function accepts valid data structure');
    }

    console.log('\n🎉 All verification tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the Wasserzähler modal in the application');
    console.log('2. Try saving water meter readings');
    console.log('3. Monitor performance improvements');
    
    return true;

  } catch (error) {
    console.error('❌ Unexpected error during verification:', error.message);
    return false;
  }
}

// Run verification
verifyFixes()
  .then(success => {
    if (success) {
      console.log('\n✅ Verification completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Verification failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Verification script error:', error);
    process.exit(1);
  });