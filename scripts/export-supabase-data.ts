import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://xjgzalzileuugptbfoqi.supabase.co'
const SUPABASE_SERVICE_KEY = 'your-service-role-key-here' // Need service role key for full export

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const OUTPUT_DIR = './supabase-export'

interface ExportResult {
  table: string
  count: number
  file: string
  error?: string
}

async function exportTable(tableName: string, query: any, fileName: string): Promise<ExportResult> {
  try {
    const { data, error } = await query
    
    if (error) {
      console.error(`❌ Error exporting ${tableName}:`, error.message)
      return { table: tableName, count: 0, file: '', error: error.message }
    }

    const filePath = path.join(OUTPUT_DIR, `${fileName}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data || [], null, 2))
    
    console.log(`✅ Exported ${tableName}: ${(data || []).length} records → ${fileName}.json`)
    return { table: tableName, count: (data || []).length, file: filePath }
  } catch (err: any) {
    console.error(`❌ Exception exporting ${tableName}:`, err.message)
    return { table: tableName, count: 0, file: '', error: err.message }
  }
}

async function exportAllData() {
  console.log('🚀 Starting Supabase Data Export...\n')
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const results: ExportResult[] = []

  // 1. Core User Data (requires service role key or admin RPC)
  console.log('📊 Exporting User Data...')
  try {
    const { data: usersData, error: usersError } = await supabase.rpc('admin_get_all_users')
    if (!usersError && usersData) {
      fs.writeFileSync(path.join(OUTPUT_DIR, 'auth_users.json'), JSON.stringify(usersData, null, 2))
      console.log(`✅ Exported auth.users: ${usersData.length} records`)
      results.push({ table: 'auth.users', count: usersData.length, file: 'auth_users.json' })
    } else {
      console.log('⚠️ Could not export auth.users (need admin access):', usersError?.message)
    }
  } catch (e: any) {
    console.log('⚠️ Could not export auth.users:', e.message)
  }

  // 2. Export all public schema tables
  console.log('\n📊 Exporting Application Data...')

  // Profiles
  results.push(await exportTable(
    'profiles',
    supabase.from('profiles').select('*'),
    'profiles'
  ))

  // Categories
  results.push(await exportTable(
    'categories',
    supabase.from('categories').select('*'),
    'categories'
  ))

  // Expense Categories
  results.push(await exportTable(
    'expense_categories',
    supabase.from('expense_categories').select('*'),
    'expense_categories'
  ))

  // Income Sources
  results.push(await exportTable(
    'income_sources',
    supabase.from('income_sources').select('*'),
    'income_sources'
  ))

  // Transactions (main financial data)
  console.log('⏳ Exporting transactions (this may take a while)...')
  results.push(await exportTable(
    'transactions',
    supabase.from('transactions').select('*').limit(100000),
    'transactions'
  ))

  // Recurring Expenses
  results.push(await exportTable(
    'recurring_expenses',
    supabase.from('recurring_expenses').select('*'),
    'recurring_expenses'
  ))

  // Recurring Income
  results.push(await exportTable(
    'recurring_income',
    supabase.from('recurring_income').select('*'),
    'recurring_income'
  ))

  // Bill Payments
  results.push(await exportTable(
    'bill_payments',
    supabase.from('bill_payments').select('*'),
    'bill_payments'
  ))

  // Savings Goals
  results.push(await exportTable(
    'savings_goals',
    supabase.from('savings_goals').select('*'),
    'savings_goals'
  ))

  // Loans
  results.push(await exportTable(
    'loans',
    supabase.from('loans').select('*'),
    'loans'
  ))

  // Profile Shares
  results.push(await exportTable(
    'profile_shares',
    supabase.from('profile_shares').select('*'),
    'profile_shares'
  ))

  // Invites
  results.push(await exportTable(
    'invites',
    supabase.from('invites').select('*'),
    'invites'
  ))

  // Grocery Item History
  results.push(await exportTable(
    'grocery_item_history',
    supabase.from('grocery_item_history').select('*'),
    'grocery_item_history'
  ))

  // Taxi Vehicles
  results.push(await exportTable(
    'taxi_vehicles',
    supabase.from('taxi_vehicles').select('*'),
    'taxi_vehicles'
  ))

  // Taxi Trips
  results.push(await exportTable(
    'taxi_trips',
    supabase.from('taxi_trips').select('*'),
    'taxi_trips'
  ))

  // Taxi Vehicle Expenses
  results.push(await exportTable(
    'taxi_vehicle_expenses',
    supabase.from('taxi_vehicle_expenses').select('*'),
    'taxi_vehicle_expenses'
  ))

  // 3. Export schema metadata
  console.log('\n📊 Exporting Schema Information...')
  try {
    const schemaInfo = {
      exported_at: new Date().toISOString(),
      supabase_url: SUPABASE_URL,
      tables: results.filter(r => r.count > 0).map(r => ({
        name: r.table,
        records: r.count,
        file: r.file
      })),
      errors: results.filter(r => r.error).map(r => ({
        table: r.table,
        error: r.error
      }))
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'export_metadata.json'), JSON.stringify(schemaInfo, null, 2))
  } catch (e) {
    console.log('⚠️ Could not save metadata')
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 EXPORT SUMMARY')
  console.log('='.repeat(60))
  
  let totalRecords = 0
  results.forEach(r => {
    if (r.count > 0) {
      console.log(`✅ ${r.table}: ${r.count} records`)
      totalRecords += r.count
    }
  })
  
  const errors = results.filter(r => r.error)
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:')
    errors.forEach(r => {
      console.log(`   ${r.table}: ${r.error}`)
    })
  }
  
  console.log(`\n📦 Total Records Exported: ${totalRecords}`)
  console.log(`📁 Output Directory: ${path.resolve(OUTPUT_DIR)}`)
  console.log('\n✨ Export Complete!')
}

// Run the export
exportAllData().catch(console.error)
