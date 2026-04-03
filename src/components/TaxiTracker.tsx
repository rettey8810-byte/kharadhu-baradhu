import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Car, Target, TrendingUp, Calendar, DollarSign, RefreshCw } from 'lucide-react'

interface TaxiTrackerProps {
  className?: string
}

interface TaxiVehicle {
  id: string
  name: string
  plate_number: string | null
  monthly_target: number | null
}

interface TaxiTrip {
  vehicle_id: string
  trip_date: string
  total_income: number
}

interface TaxiExpense {
  vehicle_id: string
  expense_date: string
  amount: number
}

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function TaxiTracker({ className = '' }: TaxiTrackerProps) {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<TaxiVehicle[]>([])
  const [trips, setTrips] = useState<TaxiTrip[]>([])
  const [expenses, setExpenses] = useState<TaxiExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Load data function - defined outside useEffect so it can be called from multiple places
  const loadData = useCallback(async () => {
    if (!user) {
      console.log('[TaxiTracker] No user, skipping load')
      return
    }
    console.log('[TaxiTracker] Loading data for user:', user.uid)
    setLoading(true)
    try {
      // Load vehicles
      const vehiclesQuery = query(
        collection(firebaseDb, 'users', user.uid, 'taxiVehicles'),
        where('user_id', '==', user.uid)
      )
      const vehiclesSnap = await getDocs(vehiclesQuery)
      console.log('[TaxiTracker] Vehicles found:', vehiclesSnap.docs.length)
      const vehiclesData = vehiclesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaxiVehicle[]
      
      // Only show vehicles with monthly target set (handle undefined/null)
      const vehiclesWithTarget = vehiclesData.filter(v => {
        const target = v.monthly_target
        const hasTarget = target !== undefined && target !== null && target > 0
        console.log(`[TaxiTracker] Vehicle ${v.name}: monthly_target=${target}, hasTarget=${hasTarget}`)
        return hasTarget
      })
      
      console.log('[TaxiTracker] Vehicles with target:', vehiclesWithTarget.length)
      
      if (vehiclesWithTarget.length > 0) {
        const currentMonth = new Date().toISOString().slice(0, 7)
        
        // Load trips for this month
        const tripsQuery = query(
          collection(firebaseDb, 'users', user.uid, 'taxiTrips'),
          where('user_id', '==', user.uid)
        )
        const tripsSnap = await getDocs(tripsQuery)
        const tripsData = tripsSnap.docs
          .map(doc => doc.data() as TaxiTrip)
          .filter(t => t.trip_date.startsWith(currentMonth))
        
        // Load expenses for this month
        const expensesQuery = query(
          collection(firebaseDb, 'users', user.uid, 'taxiVehicleExpenses'),
          where('user_id', '==', user.uid)
        )
        const expensesSnap = await getDocs(expensesQuery)
        const expensesData = expensesSnap.docs
          .map(doc => doc.data() as TaxiExpense)
          .filter(e => e.expense_date.startsWith(currentMonth))
        
        setVehicles(vehiclesWithTarget)
        setTrips(tripsData)
        setExpenses(expensesData)
      } else {
        setVehicles([])
        setTrips([])
        setExpenses([])
      }
    } catch (error) {
      console.error('[TaxiTracker] Failed to load taxi data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial load and when refreshKey or user changes
  useEffect(() => {
    console.log('[TaxiTracker] useEffect triggered - user:', user?.uid, 'refreshKey:', refreshKey)
    if (user) {
      loadData()
    } else {
      console.log('[TaxiTracker] Waiting for user auth...')
    }
  }, [loadData, refreshKey, user])

  // Retry after short delay if no user initially
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        console.log('[TaxiTracker] Retry trigger after 2s')
        setRefreshKey(k => k + 1)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [user])

  // Refresh when window gains focus (user returns from Taxi page)
  useEffect(() => {
    const handleFocus = () => {
      console.log('[TaxiTracker] Window focus - refreshing')
      setRefreshKey(k => k + 1)
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('[TaxiTracker] Interval refresh')
        setRefreshKey(k => k + 1)
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = now.getDate()
    const remainingDays = daysInMonth - currentDay

    return vehicles.map(vehicle => {
      const monthlyTarget = vehicle.monthly_target || 0
      const dailyTarget = monthlyTarget / daysInMonth
      
      // Calculate income and expenses for this vehicle this month
      const vehicleTrips = trips.filter(t => t.vehicle_id === vehicle.id)
      const vehicleExpenses = expenses.filter(e => e.vehicle_id === vehicle.id)
      
      const achieved = vehicleTrips.reduce((sum, t) => sum + Number(t.total_income), 0)
      const expensesTotal = vehicleExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      const netAchieved = achieved - expensesTotal
      
      const remainingToAchieve = Math.max(0, monthlyTarget - netAchieved)
      const requiredDailyAverage = remainingDays > 0 ? remainingToAchieve / remainingDays : 0
      
      const progressPercent = monthlyTarget > 0 ? Math.min(100, (netAchieved / monthlyTarget) * 100) : 0
      
      return {
        vehicle,
        monthlyTarget,
        dailyTarget,
        achieved,
        expensesTotal,
        netAchieved,
        remainingToAchieve,
        requiredDailyAverage,
        daysInMonth,
        currentDay,
        remainingDays,
        progressPercent
      }
    })
  }, [vehicles, trips, expenses])

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Car size={18} className="text-emerald-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Taxi Target Tracker</h3>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (stats.length === 0) {
    // Show a message instead of completely disappearing
    return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Car size={18} className="text-emerald-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Taxi Target Tracker</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          No vehicles with monthly targets. Go to <strong>Taxi</strong> page and edit a vehicle to set a target.
        </p>
        <button
          onClick={() => {
            console.log('[TaxiTracker] Manual refresh clicked')
            setRefreshKey(k => k + 1)
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-100 p-2 rounded-lg">
          <Car size={18} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Taxi Target Tracker</h3>
          <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="space-y-4">
        {stats.map(stat => (
          <div key={stat.vehicle.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
            {/* Vehicle Header */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">
                {stat.vehicle.name}
                {stat.vehicle.plate_number && (
                  <span className="text-xs text-gray-500 ml-1">({stat.vehicle.plate_number})</span>
                )}
              </h4>
              <span className="text-xs text-gray-500">
                Day {stat.currentDay} of {stat.daysInMonth}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">{stat.progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    stat.progressPercent >= 100 ? 'bg-emerald-500' : 
                    stat.progressPercent >= 75 ? 'bg-blue-500' : 
                    stat.progressPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(5, stat.progressPercent)}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-emerald-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-xs text-emerald-600 mb-1">
                  <Target size={12} />
                  <span>Monthly Target</span>
                </div>
                <p className="font-semibold text-emerald-900">{formatMVR(stat.monthlyTarget)}</p>
                <p className="text-xs text-emerald-600">Daily: {formatMVR(stat.dailyTarget)}/day</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                  <TrendingUp size={12} />
                  <span>Achieved (Net)</span>
                </div>
                <p className="font-semibold text-blue-900">{formatMVR(stat.netAchieved)}</p>
                <p className="text-xs text-blue-600">
                  Income: {formatMVR(stat.achieved)}
                </p>
              </div>
            </div>

            {/* Remaining & Required */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                  <Calendar size={12} />
                  <span>Remaining</span>
                </div>
                <p className="font-semibold text-amber-900">{formatMVR(stat.remainingToAchieve)}</p>
                <p className="text-xs text-amber-600">{stat.remainingDays} days left</p>
              </div>

              <div className={`rounded-lg p-2 ${
                stat.requiredDailyAverage > stat.dailyTarget * 1.5 ? 'bg-red-50' : 'bg-purple-50'
              }`}>
                <div className={`flex items-center gap-1 text-xs mb-1 ${
                  stat.requiredDailyAverage > stat.dailyTarget * 1.5 ? 'text-red-600' : 'text-purple-600'
                }`}>
                  <DollarSign size={12} />
                  <span>Required/Day</span>
                </div>
                <p className={`font-semibold ${
                  stat.requiredDailyAverage > stat.dailyTarget * 1.5 ? 'text-red-900' : 'text-purple-900'
                }`}>
                  {formatMVR(stat.requiredDailyAverage)}
                </p>
                <p className={`text-xs ${
                  stat.requiredDailyAverage > stat.dailyTarget * 1.5 ? 'text-red-600' : 'text-purple-600'
                }`}>
                  {stat.requiredDailyAverage > stat.dailyTarget * 1.5 ? '⚠️ Above target!' : 
                   stat.requiredDailyAverage > stat.dailyTarget ? '↑ Slightly above' : '✓ On track'}
                </p>
              </div>
            </div>

            {/* Expenses Note */}
            {stat.expensesTotal > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Expenses deducted: {formatMVR(stat.expensesTotal)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
