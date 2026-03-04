import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import { supabase } from '../lib/supabase'
import { Car, Plus, X, Pencil, MapPin, Smartphone, TrendingUp, DollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

type VehicleType = 'car' | 'bike'

type TaxiVehicle = {
  id: string
  user_id: string
  vehicle_type: VehicleType
  name: string
  plate_number: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type TaxiTrip = {
  id: string
  user_id: string
  vehicle_id: string
  trip_date: string
  trip_count: number
  rate: number
  total_income: number
  transaction_id: string | null
  notes: string | null
  app_name: string | null
  route: string | null
  created_at: string
}

const TAXI_APPS = ['Avas Ride', 'Fahi Ride', 'Gaadiya App', 'Other'] as const

// Route prices configuration - YOU CAN EDIT THESE PRICES
const ROUTE_PRICES: Record<string, number> = {
  'Inside Male\'': 15,
  'Inside HM Phase 1': 15,
  'Inside HM Phase 2': 15,
  'Male\' to HM Phase 1': 45,
  'Male\' to HM Phase 2': 50,
  'Male\' to Seaplane Terminal': 55,
  'Male\' to Airport': 35,
  'HM Phase 1 to Male\'': 45,
  'HM Phase 2 to Male\'': 50,
  'Seaplane Terminal to Male\'': 55,
  'Airport to Male\'': 35,
  'HM Phase 1 to HM Phase 2': 20,
  'HM Phase 2 to HM Phase 1': 20,
}

type TaxiVehicleExpense = {
  id: string
  user_id: string
  vehicle_id: string
  expense_date: string
  expense_type: string
  amount: number
  transaction_id: string | null
  notes: string | null
  created_at: string
}

export default function Taxi() {
  const { currentProfile } = useProfile()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [vehicles, setVehicles] = useState<TaxiVehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [trips, setTrips] = useState<TaxiTrip[]>([])
  const [expenses, setExpenses] = useState<TaxiVehicleExpense[]>([])
  const [taxiExpenseCategoryId, setTaxiExpenseCategoryId] = useState<string | null>(null)
  const [taxiIncomeSourceId, setTaxiIncomeSourceId] = useState<string | null>(null)

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [vehicleForm, setVehicleForm] = useState<{ vehicle_type: VehicleType; name: string; plate_number: string }>({
    vehicle_type: 'car',
    name: '',
    plate_number: '',
  })

  const [showAddTrip, setShowAddTrip] = useState(false)
  const [tripForm, setTripForm] = useState<{
    trip_date: string
    trip_count: string
    rate: string
    notes: string
    app_name: string
    route: string
  }>({
    trip_date: new Date().toISOString().slice(0, 10),
    trip_count: '1',
    rate: '',
    notes: '',
    app_name: 'Avas Ride',
    route: 'Inside Male\'',
  })

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseForm, setExpenseForm] = useState<{ expense_date: string; expense_type: string; amount: string; notes: string }>({
    expense_date: new Date().toISOString().slice(0, 10),
    expense_type: 'petrol',
    amount: '',
    notes: '',
  })

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentProfile) return
    load()
  }, [currentProfile])

  useEffect(() => {
    const ensureTaxiCategory = async () => {
      if (!currentProfile) return
      try {
        const { data: cats, error: catsErr } = await supabase
          .from('expense_categories')
          .select('id, name')
          .eq('profile_id', currentProfile.id)
          .eq('is_archived', false)

        if (catsErr) throw catsErr

        const existing = (cats ?? []).find((c: any) => (c.name ?? '').trim().toLowerCase() === 'taxi')
        if (existing?.id) {
          setTaxiExpenseCategoryId(existing.id)
          return
        }

        const { data: created, error: createErr } = await supabase
          .from('expense_categories')
          .insert({
            profile_id: currentProfile.id,
            name: 'Taxi',
            color: '#f59e0b',
            icon: 'Car',
            is_default: false,
            sort_order: 0,
          })
          .select('id')
          .single()

        if (createErr) throw createErr
        setTaxiExpenseCategoryId(created?.id ?? null)
      } catch {
        setTaxiExpenseCategoryId(null)
      }
    }

    ensureTaxiCategory()
  }, [currentProfile])

  useEffect(() => {
    const ensureTaxiIncomeSource = async () => {
      if (!currentProfile) return
      try {
        const { data: sources, error: sourcesErr } = await supabase
          .from('income_sources')
          .select('id, name')
          .eq('profile_id', currentProfile.id)
          .eq('is_archived', false)

        if (sourcesErr) throw sourcesErr

        const existing = (sources ?? []).find((s: any) => (s.name ?? '').trim().toLowerCase() === 'taxi')
        if (existing?.id) {
          setTaxiIncomeSourceId(existing.id)
          return
        }

        const { data: created, error: createErr } = await supabase
          .from('income_sources')
          .insert({
            profile_id: currentProfile.id,
            name: 'Taxi',
            color: '#3b82f6',
            icon: 'Car',
            is_archived: false,
          })
          .select('id')
          .single()

        if (createErr) throw createErr
        setTaxiIncomeSourceId(created?.id ?? null)
      } catch {
        setTaxiIncomeSourceId(null)
      }
    }

    ensureTaxiIncomeSource()
  }, [currentProfile])

  useEffect(() => {
    if (!selectedVehicleId) return
    loadVehicleData(selectedVehicleId)
  }, [selectedVehicleId])

  const load = async () => {
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setVehicles([])
        setSelectedVehicleId('')
        setTrips([])
        setExpenses([])
        return
      }

      const { data: vData, error: vErr } = await supabase
        .from('taxi_vehicles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (vErr) throw vErr
      const vs = (vData ?? []) as TaxiVehicle[]
      setVehicles(vs)

      const nextSelected = selectedVehicleId && vs.some(v => v.id === selectedVehicleId)
        ? selectedVehicleId
        : (vs[0]?.id ?? '')
      setSelectedVehicleId(nextSelected)

      if (!nextSelected) {
        setTrips([])
        setExpenses([])
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load taxi data')
    }
  }

  const loadVehicleData = async (vehicleId: string) => {
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: tData, error: tErr }, { data: eData, error: eErr }] = await Promise.all([
        supabase
          .from('taxi_trips')
          .select('*')
          .eq('user_id', user.id)
          .eq('vehicle_id', vehicleId)
          .order('trip_date', { ascending: false })
          .limit(30),
        supabase
          .from('taxi_vehicle_expenses')
          .select('*')
          .eq('user_id', user.id)
          .eq('vehicle_id', vehicleId)
          .order('expense_date', { ascending: false })
          .limit(30)
      ])

      if (tErr) throw tErr
      if (eErr) throw eErr

      setTrips((tData ?? []) as any)
      setExpenses((eData ?? []) as any)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load vehicle activity')
    }
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const monthKey = new Date().toISOString().slice(0, 7)
    const yearKey = new Date().toISOString().slice(0, 4)

    // Day stats
    const todayTrips = trips.filter(t => t.trip_date === today)
    const dayIncome = todayTrips.reduce((sum, it) => sum + Number(it.total_income), 0)
    const dayExpense = expenses.filter(e => e.expense_date === today).reduce((sum, it) => sum + Number(it.amount), 0)
    const dayTripCount = todayTrips.reduce((sum, it) => sum + Number(it.trip_count), 0)

    // Month stats
    const monthTrips = trips.filter(t => t.trip_date.startsWith(monthKey))
    const monthlyIncome = monthTrips.reduce((sum, it) => sum + Number(it.total_income), 0)
    const monthlyExpense = expenses.filter(e => e.expense_date.startsWith(monthKey)).reduce((sum, it) => sum + Number(it.amount), 0)
    const monthTripCount = monthTrips.reduce((sum, it) => sum + Number(it.trip_count), 0)

    // Year stats
    const yearTrips = trips.filter(t => t.trip_date.startsWith(yearKey))
    const yearlyIncome = yearTrips.reduce((sum, it) => sum + Number(it.total_income), 0)
    const yearlyExpense = expenses.filter(e => e.expense_date.startsWith(yearKey)).reduce((sum, it) => sum + Number(it.amount), 0)

    // Overall stats
    const overallIncome = trips.reduce((sum, it) => sum + Number(it.total_income), 0)
    const overallExpense = expenses.reduce((sum, it) => sum + Number(it.amount), 0)
    const totalTrips = trips.reduce((sum, it) => sum + Number(it.trip_count), 0)

    // Most popular route
    const routeCounts: Record<string, number> = {}
    trips.forEach(t => {
      if (t.route) {
        routeCounts[t.route] = (routeCounts[t.route] || 0) + Number(t.trip_count)
      }
    })
    const mostPopularRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0] || ['-', 0]

    // Trips by app
    const appCounts: Record<string, number> = {}
    trips.forEach(t => {
      const app = t.app_name || 'Other'
      appCounts[app] = (appCounts[app] || 0) + Number(t.trip_count)
    })
    const tripsByApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])

    // This week stats (last 7 days)
    const weekDates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      weekDates.push(d.toISOString().slice(0, 10))
    }
    const weekTrips = trips.filter(t => weekDates.includes(t.trip_date))
    const weekIncome = weekTrips.reduce((sum, it) => sum + Number(it.total_income), 0)
    const weekExpense = expenses.filter(e => weekDates.includes(e.expense_date)).reduce((sum, it) => sum + Number(it.amount), 0)

    // Average per trip
    const avgPerTrip = totalTrips > 0 ? overallIncome / totalTrips : 0

    return {
      dayIncome,
      dayExpense,
      dayProfit: dayIncome - dayExpense,
      dayTripCount,
      monthlyIncome,
      monthlyExpense,
      monthlyProfit: monthlyIncome - monthlyExpense,
      monthTripCount,
      yearlyIncome,
      yearlyExpense,
      yearlyProfit: yearlyIncome - yearlyExpense,
      overallIncome,
      overallExpense,
      overallProfit: overallIncome - overallExpense,
      totalTrips,
      mostPopularRoute: { name: mostPopularRoute[0], count: mostPopularRoute[1] },
      tripsByApp,
      weekIncome,
      weekExpense,
      weekProfit: weekIncome - weekExpense,
      avgPerTrip,
    }
  }, [trips, expenses])

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const name = vehicleForm.name.trim()
      const plate = vehicleForm.plate_number.trim()
      if (!name) return

      const { error: insErr } = await supabase
        .from('taxi_vehicles')
        .insert({
          user_id: user.id,
          vehicle_type: vehicleForm.vehicle_type,
          name,
          plate_number: plate ? plate : null,
        })
      if (insErr) throw insErr

      setVehicleForm({ vehicle_type: 'car', name: '', plate_number: '' })
      setShowAddVehicle(false)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add vehicle')
    }
  }

  const addTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!currentProfile) return
    if (!selectedVehicleId) return

    const count = Number(tripForm.trip_count)
    const rate = Number(tripForm.rate)
    if (!Number.isFinite(count) || count <= 0) return
    if (!Number.isFinite(rate) || rate <= 0) return

    const total = count * rate

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)
    const vehicleLabel = selectedVehicle
      ? `${selectedVehicle.name}${selectedVehicle.plate_number ? ` (${selectedVehicle.plate_number})` : ''}`
      : selectedVehicleId

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const appInfo = tripForm.app_name ? ` [${tripForm.app_name}]` : ''
      const routeInfo = tripForm.route ? ` - ${tripForm.route}` : ''

      // Create a general transaction so this affects dashboards/budgets
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .insert({
          profile_id: currentProfile.id,
          type: 'income',
          amount: total,
          description: `Taxi${appInfo}${routeInfo} - ${vehicleLabel}`,
          notes: tripForm.notes.trim()
            ? `Vehicle: ${vehicleLabel}\nApp: ${tripForm.app_name}\nRoute: ${tripForm.route}\nTrips: ${count}\nRate: ${rate}\n${tripForm.notes.trim()}`
            : `Vehicle: ${vehicleLabel}\nApp: ${tripForm.app_name}\nRoute: ${tripForm.route}\nTrips: ${count}\nRate: ${rate}`,
          transaction_date: tripForm.trip_date,
          category_id: null,
          income_source_id: taxiIncomeSourceId,
        })
        .select()
        .single()
      if (txErr) throw txErr

      const { error: tripErr } = await supabase
        .from('taxi_trips')
        .insert({
          user_id: user.id,
          vehicle_id: selectedVehicleId,
          trip_date: tripForm.trip_date,
          trip_count: count,
          rate,
          total_income: total,
          transaction_id: txData?.id ?? null,
          notes: tripForm.notes.trim() ? tripForm.notes.trim() : null,
          app_name: tripForm.app_name || null,
          route: tripForm.route || null,
        })
      if (tripErr) throw tripErr

      setTripForm({ trip_date: new Date().toISOString().slice(0, 10), trip_count: '1', rate: '', notes: '', app_name: 'Avas Ride', route: 'Inside Male\'' })
      setShowAddTrip(false)
      await loadVehicleData(selectedVehicleId)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add trip')
    }
  }

  const addVehicleExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!currentProfile) return
    if (!selectedVehicleId) return

    const amt = Number(expenseForm.amount)
    if (!Number.isFinite(amt) || amt <= 0) return

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)
    const vehicleLabel = selectedVehicle
      ? `${selectedVehicle.name}${selectedVehicle.plate_number ? ` (${selectedVehicle.plate_number})` : ''}`
      : selectedVehicleId

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .insert({
          profile_id: currentProfile.id,
          type: 'expense',
          amount: amt,
          description: `Taxi expense - ${expenseForm.expense_type} - ${vehicleLabel}`,
          notes: expenseForm.notes.trim() ? `Vehicle: ${vehicleLabel}\n${expenseForm.notes.trim()}` : `Vehicle: ${vehicleLabel}`,
          transaction_date: expenseForm.expense_date,
          category_id: taxiExpenseCategoryId,
          income_source_id: null,
        })
        .select()
        .single()
      if (txErr) throw txErr

      const { error: expErr } = await supabase
        .from('taxi_vehicle_expenses')
        .insert({
          user_id: user.id,
          vehicle_id: selectedVehicleId,
          expense_date: expenseForm.expense_date,
          expense_type: expenseForm.expense_type,
          amount: amt,
          transaction_id: txData?.id ?? null,
          notes: expenseForm.notes.trim() ? expenseForm.notes.trim() : null,
        })
      if (expErr) throw expErr

      setExpenseForm({ expense_date: new Date().toISOString().slice(0, 10), expense_type: 'petrol', amount: '', notes: '' })
      setShowAddExpense(false)
      await loadVehicleData(selectedVehicleId)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add expense')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="text-emerald-600" />
            Taxi
          </h1>
          <p className="text-sm text-gray-500">Track taxi income, vehicle expenses, and profit</p>
        </div>
        {vehicles.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddVehicle(true)}
            className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"
            title="Add vehicle"
          >
            <Plus size={22} />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {vehicles.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="text-sm text-gray-600">Vehicle</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.name}{v.plate_number ? ` (${v.plate_number})` : ''}
              </option>
            ))}
          </select>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setTripForm({ ...tripForm, trip_date: new Date().toISOString().slice(0, 10) })
                setShowAddTrip(true)
              }}
              className="bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 text-sm"
            >
              Mark Today
            </button>
            <button
              type="button"
              onClick={() => setShowAddTrip(true)}
              className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Add Trip
            </button>
            <button
              type="button"
              onClick={() => setShowAddExpense(true)}
              className="bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
            >
              Add Expense
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/transactions?taxi=1')}
            className="mt-2 w-full border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
          >
            View in All Transactions
          </button>
        </div>
      )}

      {/* Enhanced Dashboard */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Stats Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <DollarSign size={18} />
            </div>
            <span className="text-sm font-medium text-emerald-50">Today</span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-emerald-100">Income</p>
              <p className="text-lg font-bold">{formatMVR(stats.dayIncome)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-emerald-100">Trips</p>
                <p className="text-sm font-semibold">{stats.dayTripCount}</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-emerald-100">Profit</p>
                <p className={`text-sm font-semibold ${stats.dayProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
                  {formatMVR(stats.dayProfit)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Month Stats Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm font-medium text-blue-50">This Month</span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-blue-100">Income</p>
              <p className="text-lg font-bold">{formatMVR(stats.monthlyIncome)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-blue-100">Trips</p>
                <p className="text-sm font-semibold">{stats.monthTripCount}</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-blue-100">Profit</p>
                <p className={`text-sm font-semibold ${stats.monthlyProfit >= 0 ? 'text-white' : 'text-red-200'}`}>
                  {formatMVR(stats.monthlyProfit)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Most Popular Route Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <MapPin size={18} className="text-amber-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Most Popular Route</h3>
        </div>
        {stats.mostPopularRoute.count > 0 ? (
          <div className="flex items-center justify-between bg-amber-50 rounded-xl p-3">
            <div>
              <p className="font-medium text-gray-900">{stats.mostPopularRoute.name}</p>
              <p className="text-sm text-gray-500">{stats.mostPopularRoute.count} trips</p>
            </div>
            <div className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
              #{1}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No trips recorded yet</p>
        )}
      </div>

      {/* Trips by App */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Smartphone size={18} className="text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Trips by App</h3>
        </div>
        {stats.tripsByApp.length > 0 ? (
          <div className="space-y-2">
            {stats.tripsByApp.slice(0, 4).map(([app, count], index) => (
              <div key={app} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-200 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{app}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{count} trips</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-500' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${Math.min(100, (count / stats.totalTrips) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No trips recorded yet</p>
        )}
      </div>

      {/* Weekly Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">Last 7 Days</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">Income</p>
            <p className="text-sm font-bold text-blue-900">{formatMVR(stats.weekIncome)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-red-600 mb-1">Expenses</p>
            <p className="text-sm font-bold text-red-900">{formatMVR(stats.weekExpense)}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${stats.weekProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className={`text-xs mb-1 ${stats.weekProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Profit</p>
            <p className={`text-sm font-bold ${stats.weekProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>{formatMVR(stats.weekProfit)}</p>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="bg-gray-900 rounded-2xl p-4 text-white shadow-lg">
        <h3 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
          <Car size={18} />
          All Time Statistics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400">Total Income</p>
            <p className="text-lg font-bold text-emerald-400">{formatMVR(stats.overallIncome)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400">Total Expenses</p>
            <p className="text-lg font-bold text-red-400">{formatMVR(stats.overallExpense)}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400">Total Trips</p>
            <p className="text-lg font-bold text-blue-400">{stats.totalTrips}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400">Avg/Trip</p>
            <p className="text-lg font-bold text-amber-400">{formatMVR(stats.avgPerTrip)}</p>
          </div>
        </div>
        <div className="mt-3 bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Total Profit</p>
          <p className={`text-xl font-bold ${stats.overallProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMVR(stats.overallProfit)}
          </p>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-center py-6">
            <Car size={44} className="mx-auto text-gray-300" />
            <h2 className="mt-3 text-base font-semibold text-gray-900">Add your first vehicle</h2>
            <p className="mt-1 text-sm text-gray-500">Start by adding your taxi car or bike.</p>
            <button
              type="button"
              className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700"
              onClick={() => setShowAddVehicle(true)}
            >
              Add Vehicle
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Trips</h3>
            {trips.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">No trips yet</p>
            ) : (
              <div className="mt-3 space-y-2">
                {trips.slice(0, 8).map(tr => (
                  <div key={tr.id} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tr.trip_date} • {tr.app_name && <span className="text-blue-600">[{tr.app_name}]</span>} {tr.route && <span className="text-gray-500">- {tr.route}</span>}
                      </p>
                      <p className="text-xs text-gray-500">{tr.trip_count} trips × {formatMVR(Number(tr.rate))}</p>
                      {tr.notes && <p className="text-xs text-gray-400 mt-1">{tr.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-blue-700">{formatMVR(Number(tr.total_income))}</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/transactions?taxi=1&month=${tr.trip_date.slice(0, 7)}&edit=${tr.transaction_id}`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit transaction"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Expenses</h3>
            {expenses.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">No expenses yet</p>
            ) : (
              <div className="mt-3 space-y-2">
                {expenses.slice(0, 8).map(ex => (
                  <div key={ex.id} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ex.expense_date} • {ex.expense_type}</p>
                      <p className="text-xs text-gray-500">{ex.notes ?? ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-700">-{formatMVR(Number(ex.amount))}</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/transactions?taxi=1&month=${ex.expense_date.slice(0, 7)}&edit=${ex.transaction_id}`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit transaction"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Vehicle</h2>
              <button
                type="button"
                onClick={() => setShowAddVehicle(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addVehicle} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Vehicle type</label>
                <select
                  value={vehicleForm.vehicle_type}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value as VehicleType })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                >
                  <option value="car">Car</option>
                  <option value="bike">Bike</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Name / Plate</label>
                <input
                  value={vehicleForm.name}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  placeholder="e.g., BAA-1234"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Plate number (optional)</label>
                <input
                  value={vehicleForm.plate_number}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  placeholder="e.g., BAA-1234"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Trip</h2>
              <button type="button" onClick={() => setShowAddTrip(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addTrip} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  value={tripForm.trip_date}
                  onChange={(e) => setTripForm({ ...tripForm, trip_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Taxi App</label>
                <select
                  value={tripForm.app_name}
                  onChange={(e) => setTripForm({ ...tripForm, app_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                >
                  {TAXI_APPS.map(app => (
                    <option key={app} value={app}>{app}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Route / Location</label>
                <select
                  value={tripForm.route}
                  onChange={(e) => {
                    const route = e.target.value
                    const price = ROUTE_PRICES[route] || 0
                    setTripForm({ 
                      ...tripForm, 
                      route,
                      rate: price > 0 ? String(price) : tripForm.rate
                    })
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                >
                  {Object.keys(ROUTE_PRICES).map(route => (
                    <option key={route} value={route}>{route} {ROUTE_PRICES[route] > 0 ? `(MVR ${ROUTE_PRICES[route]})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Trips</label>
                  <input
                    type="number"
                    value={tripForm.trip_count}
                    onChange={(e) => setTripForm({ ...tripForm, trip_count: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                    min={1}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Rate (MVR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tripForm.rate}
                    onChange={(e) => setTripForm({ ...tripForm, rate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Total</label>
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 bg-gray-50 text-gray-900">
                  {formatMVR((Number(tripForm.trip_count) || 0) * (Number(tripForm.rate) || 0))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Notes</label>
                <textarea
                  value={tripForm.notes}
                  onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  rows={2}
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTrip(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Expense</h2>
              <button type="button" onClick={() => setShowAddExpense(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addVehicleExpense} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Expense type</label>
                <select
                  value={expenseForm.expense_type}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                >
                  <option value="petrol">Petrol</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="service">Service</option>
                  <option value="engine_oil">Engine oil</option>
                  <option value="washing">Washing</option>
                  <option value="insurance">Insurance</option>
                  <option value="road_worthiness">Road worthiness</option>
                  <option value="annual_fee">Annual fee</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Amount (MVR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Notes</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  rows={2}
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
