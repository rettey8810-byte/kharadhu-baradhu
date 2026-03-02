import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import { supabase } from '../lib/supabase'
import { Car, Plus, Wallet, ArrowUpCircle, ArrowDownCircle, X } from 'lucide-react'
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
  created_at: string
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
  const [tripForm, setTripForm] = useState<{ trip_date: string; trip_count: string; rate: string; notes: string }>({
    trip_date: new Date().toISOString().slice(0, 10),
    trip_count: '1',
    rate: '',
    notes: '',
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

  const summary = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7)

    const monthlyIncome = trips
      .filter(t => t.trip_date.startsWith(monthKey))
      .reduce((sum, it) => sum + Number(it.total_income), 0)
    const monthlyExpense = expenses
      .filter(e => e.expense_date.startsWith(monthKey))
      .reduce((sum, it) => sum + Number(it.amount), 0)

    const overallIncome = trips.reduce((sum, it) => sum + Number(it.total_income), 0)
    const overallExpense = expenses.reduce((sum, it) => sum + Number(it.amount), 0)

    return {
      monthlyIncome,
      monthlyExpense,
      monthlyProfit: monthlyIncome - monthlyExpense,
      overallIncome,
      overallExpense,
      overallProfit: overallIncome - overallExpense,
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

      // Create a general transaction so this affects dashboards/budgets
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .insert({
          profile_id: currentProfile.id,
          type: 'income',
          amount: total,
          description: `Taxi income - ${vehicleLabel}`,
          notes: tripForm.notes.trim()
            ? `Vehicle: ${vehicleLabel}\nTrips: ${count}\nRate: ${rate}\n${tripForm.notes.trim()}`
            : `Vehicle: ${vehicleLabel}\nTrips: ${count}\nRate: ${rate}`,
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
        })
      if (tripErr) throw tripErr

      setTripForm({ trip_date: new Date().toISOString().slice(0, 10), trip_count: '1', rate: '', notes: '' })
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

          <div className="mt-3 grid grid-cols-2 gap-2">
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

      {/* Profit summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 rounded-xl p-3">
            <Wallet size={20} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Monthly Profit</p>
            <p className="text-xl font-semibold text-gray-900">{formatMVR(summary.monthlyProfit)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-700 flex items-center gap-1">
              <ArrowUpCircle size={14} /> Income
            </p>
            <p className="text-sm font-semibold text-blue-900">{formatMVR(summary.monthlyIncome)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
            <p className="text-xs text-red-700 flex items-center gap-1">
              <ArrowDownCircle size={14} /> Expenses
            </p>
            <p className="text-sm font-semibold text-red-900">{formatMVR(summary.monthlyExpense)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-600">Overall Profit</p>
            <p className="text-sm font-semibold text-gray-900">{formatMVR(summary.overallProfit)}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-600">Overall Income / Expenses</p>
            <p className="text-sm font-semibold text-gray-900">{formatMVR(summary.overallIncome)} / {formatMVR(summary.overallExpense)}</p>
          </div>
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
                      <p className="text-sm font-medium text-gray-900">{tr.trip_date} • {tr.trip_count} trips × {formatMVR(Number(tr.rate))}</p>
                      <p className="text-xs text-gray-500">{tr.notes ?? ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-blue-700">{formatMVR(Number(tr.total_income))}</span>
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
                    <span className="text-sm font-semibold text-red-700">-{formatMVR(Number(ex.amount))}</span>
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
