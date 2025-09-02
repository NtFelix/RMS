#!/usr/bin/env node

/**
 * Script to apply database functions for betriebskosten performance optimization
 * 
 * This script reads the migration file and applies the database functions to Supabase.
 * Run this script when the database functions are missing.
 * 
 * Usage:
 *   node scripts/apply-database-functions.js
 * 
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set
 *   - The migration file must exist at supabase/migrations/20250202000000_add_performance_optimization_functions.sql
 */

const fs = require('fs');
const path = require('path');

async function applyDatabaseFunctions() {
  try {
    // Check if environment variables are set
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing required environment variables:');
      console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
      console.error('   You can find these in your Supabase project settings');
      process.exit(1);
    }

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250202000000_add_performance_optimization_functions.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📖 Read migration file:', migrationPath);

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔗 Connected to Supabase');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(/;\s*$/gm)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        const functionName = statement.match(/CREATE OR REPLACE FUNCTION (\w+)/)?.[1];
        console.log(`⚡ Creating function: ${functionName || 'unknown'}`);
      } else if (statement.includes('GRANT EXECUTE')) {
        console.log('🔐 Granting permissions');
      } else if (statement.includes('COMMENT ON FUNCTION')) {
        console.log('📝 Adding documentation');
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if rpc fails
          const { error: queryError } = await supabase
            .from('_dummy_table_that_does_not_exist')
            .select('*')
            .limit(0);
          
          // If that also fails, try using the REST API directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            },
            body: JSON.stringify({ sql: statement })
          });

          if (!response.ok) {
            console.error(`❌ Failed to execute statement ${i + 1}:`, error?.message || 'Unknown error');
            console.error('Statement:', statement.substring(0, 100) + '...');
            continue;
          }
        }

        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
      }
    }

    // Test if functions were created successfully
    console.log('\n🧪 Testing database functions...');
    
    const testFunctions = [
      'get_nebenkosten_with_metrics',
      'get_wasserzaehler_modal_data',
      'get_abrechnung_modal_data',
      'save_wasserzaehler_batch'
    ];

    for (const functionName of testFunctions) {
      try {
        const { data, error } = await supabase
          .from('information_schema.routines')
          .select('routine_name')
          .eq('routine_name', functionName)
          .eq('routine_schema', 'public');

        if (error) {
          console.log(`❓ Could not verify function ${functionName}: ${error.message}`);
        } else if (data && data.length > 0) {
          console.log(`✅ Function ${functionName} exists`);
        } else {
          console.log(`❌ Function ${functionName} not found`);
        }
      } catch (err) {
        console.log(`❓ Could not test function ${functionName}: ${err.message}`);
      }
    }

    console.log('\n🎉 Database function application completed!');
    console.log('💡 You can now restart your Next.js application to use the optimized functions');

  } catch (error) {
    console.error('❌ Failed to apply database functions:', error.message);
    console.error('\n📋 Manual steps to apply functions:');
    console.error('1. Open your Supabase dashboard');
    console.error('2. Go to SQL Editor');
    console.error('3. Copy and paste the contents of supabase/migrations/20250202000000_add_performance_optimization_functions.sql');
    console.error('4. Run the SQL script');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  applyDatabaseFunctions();
}

module.exports = { applyDatabaseFunctions };