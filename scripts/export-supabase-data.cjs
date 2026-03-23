/**
 * Supabase Data Export Script
 * 
 * This script exports ALL data from your Supabase database for migration to Firebase.
 * 
 * PREREQUISITES:
 * 1. Install Node.js
 * 2. Run: npm install @supabase/supabase-js
 * 3. Get your Supabase SERVICE ROLE KEY (not anon key) from Project Settings > API
 * 
 * USAGE:
 *   node export-supabase-data.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const SUPABASE_URL = 'https://xjgzalzileuugptbfoqi.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZ3phbHppbGV1dWdwdGJmb3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE3OTM0MiwiZXhwIjoyMDg3NzU1MzQyfQ.RHJXAmcmj9RXmGcQeoXfHXE3qElLWJv7H-6nqe_JR4U'
// ============================================

const OUTPUT_DIR = path.join(__dirname, '..', 'supabase-export-data')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function exportTable(tableName, select = '*', limit = 100000) {
  try {
    console.log(`⏳ Exporting ${tableName}...`)
    
    const { data, error } = await supabase
      .from(tableName)
      .select(select)
      .limit(limit)

    if (error) {
      console.error(`❌ Error exporting ${tableName}:`, error.message)
      return { table: tableName, count: 0, error: error.message }
    }

    const records = data || []
    const fileName = `${tableName}.json`
    const filePath = path.join(OUTPUT_DIR, fileName)
    
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2))
    
    console.log(`✅ ${tableName}: ${records.length} records`)
    return { table: tableName, count: records.length, file: fileName }
  } catch (err) {
    console.error(`❌ Exception in ${tableName}:`, err.message)
    return { table: tableName, count: 0, error: err.message }
  }
}

async function exportAuthUsers() {
  try {
    console.log('⏳ Exporting auth.users via admin function...')
    
    // Try using the admin RPC function we created
    const { data, error } = await supabase.rpc('admin_get_all_users')
    
    if (error) {
      console.log(`⚠️ Could not export auth.users via RPC: ${error.message}`)
      console.log('   You may need to manually export users from Supabase Dashboard')
      return { table: 'auth.users', count: 0, error: error.message }
    }

    const filePath = path.join(OUTPUT_DIR, 'auth_users.json')
    fs.writeFileSync(filePath, JSON.stringify(data || [], null, 2))
    
    console.log(`✅ auth.users: ${(data || []).length} records`)
    return { table: 'auth.users', count: (data || []).length, file: 'auth_users.json' }
  } catch (err) {
    console.log('⚠️ Could not export auth.users:', err.message)
    return { table: 'auth.users', count: 0, error: err.message }
  }
}

async function exportAllData() {
  console.log('='.repeat(70))
  console.log('  SUPERBASE DATA EXPORT FOR FIREBASE MIGRATION')
  console.log('='.repeat(70))
  console.log(`Output directory: ${path.resolve(OUTPUT_DIR)}\n`)
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const results = []

  // 1. Auth Users
  results.push(await exportAuthUsers())

  // 2. Core Application Tables
  console.log('\n📦 Exporting Core Tables...')
  results.push(await exportTable('profiles'))
  results.push(await exportTable('categories'))
  results.push(await exportTable('expense_categories'))
  results.push(await exportTable('income_sources'))
  
  // 3. Financial Data (may be large)
  console.log('\n📦 Exporting Financial Data...')
  results.push(await exportTable('transactions', '*', 1000000)) // Up to 1M records
  
  // 4. Recurring Data
  console.log('\n📦 Exporting Recurring Data...')
  results.push(await exportTable('recurring_expenses'))
  results.push(await exportTable('recurring_income'))
  results.push(await exportTable('bill_payments'))
  
  // 5. Goals & Planning
  console.log('\n📦 Exporting Goals & Planning...')
  results.push(await exportTable('savings_goals'))
  results.push(await exportTable('loans'))
  
  // 6. Sharing & Invites
  console.log('\n📦 Exporting Sharing Data...')
  results.push(await exportTable('profile_shares'))
  results.push(await exportTable('invites'))
  
  // 7. Grocery & Shopping
  console.log('\n📦 Exporting Shopping Data...')
  results.push(await exportTable('grocery_item_history'))
  
  // 8. Taxi/Business Data
  console.log('\n📦 Exporting Taxi Business Data...')
  results.push(await exportTable('taxi_vehicles'))
  results.push(await exportTable('taxi_trips'))
  results.push(await exportTable('taxi_vehicle_expenses'))
  
  // 9. Budgets
  results.push(await exportTable('category_budgets'))
  results.push(await exportTable('bill_reminders'))

  // Save metadata
  const metadata = {
    exported_at: new Date().toISOString(),
    supabase_project: SUPABASE_URL,
    tables: results.filter(r => r.count > 0).map(r => ({
      name: r.table,
      records: r.count,
      file: r.file
    })),
    errors: results.filter(r => r.error).map(r => ({
      table: r.table,
      error: r.error
    })),
    total_records: results.reduce((sum, r) => sum + r.count, 0)
  }
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_export_metadata.json'),
    JSON.stringify(metadata, null, 2)
  )

  // Print Summary
  console.log('\n' + '='.repeat(70))
  console.log('  EXPORT COMPLETE')
  console.log('='.repeat(70))
  
  const successful = results.filter(r => r.count > 0)
  const failed = results.filter(r => r.error && r.count === 0)
  
  console.log(`\n✅ Successfully exported: ${successful.length} tables`)
  console.log(`❌ Failed: ${failed.length} tables`)
  console.log(`📊 Total records: ${metadata.total_records}`)
  
  console.log('\n📁 Files created in:', OUTPUT_DIR)
  successful.forEach(r => {
    console.log(`   • ${r.file} (${r.count} records)`)
  })
  
  if (failed.length > 0) {
    console.log('\n⚠️  Failed tables:')
    failed.forEach(r => {
      console.log(`   • ${r.table}: ${r.error}`)
    })
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('  NEXT STEPS:')
  console.log('='.repeat(70))
  console.log('1. Check all files in:', OUTPUT_DIR)
  console.log('2. Verify data integrity')
  console.log('3. Run the Firebase import script')
  console.log('4. Update app to use Firebase instead of Supabase')
  console.log('='.repeat(70))
}

// Check for required dependencies
try {
  require('@supabase/supabase-js')
} catch (e) {
  console.error('❌ Missing dependency: @supabase/supabase-js')
  console.log('Run: npm install @supabase/supabase-js')
  process.exit(1)
}

// Run export
exportAllData().catch(err => {
  console.error('❌ Export failed:', err)
  process.exit(1)
})
