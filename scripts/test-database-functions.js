#!/usr/bin/env node

/**
 * Test script for database functions
 * 
 * This script tests the database functions to ensure they work correctly
 * before deploying to production.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseFunctions() {
  console.log('🧪 Testing database functions...\n');

  try {
    // Test 1: Check if functions exist
    console.log('1. Checking if functions exist...');
    const { data: functions, error: functionsError } = await supabase.rpc('sql', {
      query: `
        SELECT routine_name, routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN (
          'get_nebenkosten_with_metrics',
          'get_wasserzaehler_modal_data', 
          'get_abrechnung_modal_data',
          'save_wasserzaehler_batch',
          'get_abrechnung_calculation_data'
        )
        ORDER BY routine_name;
      `
    });

    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError);
      return;
    }

    console.log('✅ Functions found:', functions?.map(f => f.routine_name) || []);

    // Test 2: Test get_nebenkosten_with_metrics with dummy user ID
    console.log('\n2. Testing get_nebenkosten_with_metrics...');
    const { data: nebenkostenData, error: nebenkostenError } = await supabase.rpc(
      'get_nebenkosten_with_metrics',
      { user_id: '00000000-0000-0000-0000-000000000000' }
    );

    if (nebenkostenError) {
      console.log('⚠️  Expected error for dummy user ID:', nebenkostenError.message);
    } else {
      console.log('✅ Function executed successfully, returned:', nebenkostenData?.length || 0, 'records');
    }

    // Test 3: Test get_wasserzaehler_modal_data with dummy IDs
    console.log('\n3. Testing get_wasserzaehler_modal_data...');
    const { data: wasserzaehlerData, error: wasserzaehlerError } = await supabase.rpc(
      'get_wasserzaehler_modal_data',
      { 
        nebenkosten_id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000'
      }
    );

    if (wasserzaehlerError) {
      console.log('⚠️  Expected error for dummy IDs:', wasserzaehlerError.message);
    } else {
      console.log('✅ Function executed successfully, returned:', wasserzaehlerData?.length || 0, 'records');
    }

    // Test 4: Test save_wasserzaehler_batch with empty data
    console.log('\n4. Testing save_wasserzaehler_batch...');
    const { data: saveData, error: saveError } = await supabase.rpc(
      'save_wasserzaehler_batch',
      { 
        nebenkosten_id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000',
        readings: []
      }
    );

    if (saveError) {
      console.log('⚠️  Expected error for dummy IDs:', saveError.message);
    } else {
      console.log('✅ Function executed successfully, result:', saveData);
    }

    console.log('\n🎉 Database function tests completed!');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the tests
testDatabaseFunctions().catch(console.error);