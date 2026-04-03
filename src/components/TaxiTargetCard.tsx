import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Target, TrendingUp, Calendar, DollarSign, Car } from 'lucide-react'

interface TaxiTargetCardProps {
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

export default function TaxiTargetCard({ className = '' }: TaxiTargetCardProps) {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<TaxiVehicle[]>([])
  const [trips, setTrips] = useState<TaxiTrip[]>([])
  const [expenses, setExpenses] = useState<TaxiExpense[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Load vehicles
      const vehiclesQuery = query(
        collection(firebaseDb, 'users', user.uid, 'taxiVehicles'),
        where('user_id', '==', user.uid)
      )
      const vehiclesSnap = await getDocs(vehiclesQuery)
      const vehiclesData = vehiclesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaxiVehicle[]
      
      // Only show vehicles with monthly target set
      const vehiclesWithTarget = vehiclesData.filter(v => {
        const target = v.monthly_target
        return target !== undefined && target !== null && target > 0
      })
      
      if (vehiclesWithTarget.length > 0) {
        const currentMonth = new Date().toISOString().slice(0, 7)
        
        // Load trips for this month
        const tripsQuery = query(
          collection(firebaseDb, 'users', user.uid, 'taxiTrips'),
          where('user_id', '==', user.uid)
        )
        const tripsSnap = await getDocs(tripsQuery)
        const tripsData = tripsSnap.docs
          .map(doc => {
            const data = doc.data() as TaxiTrip
            const tripDateRaw = data.trip_date as any
            const tripDate = typeof tripDateRaw === 'string' 
              ? tripDateRaw 
              : tripDateRaw?.toDate?.().toISOString().slice(0, 10) || ''
            return { ...data, trip_date: tripDate }
          })
          .filter(t => t.trip_date?.startsWith(currentMonth))
        
        // Load expenses for this month
        const expensesQuery = query(
          collection(firebaseDb, 'users', user.uid, 'taxiVehicleExpenses'),
          where('user_id', '==', user.uid)
        )
        const expensesSnap = await getDocs(expensesQuery)
        const expensesData = expensesSnap.docs
          .map(doc => {
            const data = doc.data() as TaxiExpense
            const expenseDateRaw = data.expense_date as any
            const expenseDate = typeof expenseDateRaw === 'string' 
              ? expenseDateRaw 
              : expenseDateRaw?.toDate?.().toISOString().slice(0, 10) || ''
            return { ...data, expense_date: expenseDate }
          })
          .filter(e => e.expense_date?.startsWith(currentMonth))
        
        setVehicles(vehiclesWithTarget)
        setTrips(tripsData)
        setExpenses(expensesData)
      } else {
        setVehicles([])
        setTrips([])
        setExpenses([])
      }
    } catch (error) {
      console.error('Failed to load taxi data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [loadData, user])

  const stats = useMemo(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = now.getDate()
    const remainingDays = daysInMonth - currentDay

    return vehicles.map(vehicle => {
      const monthlyTarget = vehicle.monthly_target || 0
      const dailyTarget = monthlyTarget / daysInMonth
      
      const vehicleTrips = trips.filter(t => t.vehicle_id === vehicle.id)
      const vehicleExpenses = expenses.filter(e => e.vehicle_id === vehicle.id)
      
      const income = vehicleTrips.reduce((sum, t) => sum + Number(t.total_income), 0)
      const expensesTotal = vehicleExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      const netIncome = income - expensesTotal
      
      const remainingToAchieve = Math.max(0, monthlyTarget - netIncome)
      const requiredDaily = remainingDays > 0 ? remainingToAchieve / remainingDays : 0
      const progressPercent = monthlyTarget > 0 ? Math.min(100, (netIncome / monthlyTarget) * 100) : 0
      
      return {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        monthlyTarget,
        dailyTarget,
        income,
        expensesTotal,
        netIncome,
        remainingToAchieve,
        requiredDaily,
        progressPercent,
        daysInMonth,
        currentDay,
        remainingDays
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
          <h3 className="font-semibold text-gray-900">Taxi Monthly Target</h3>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (stats.length === 0) {
    return null // Don't show anything if no targets set
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {stats.map(stat => (
        <div key={stat.vehicleId} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Target size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Monthly Target: {stat.vehicleName}</h3>
              <p className="text-xs text-gray-500">Day {stat.currentDay} of {stat.daysInMonth}</p>
            </div>
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
              <p className="font-semibold text-blue-900">{formatMVR(stat.netIncome)}</p>
              <p className="text-xs text-blue-600">
                Income: {formatMVR(stat.income)}
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
              stat.requiredDaily > stat.dailyTarget * 1.5 ? 'bg-red-50' : 'bg-purple-50'
            }`}>
              <div className={`flex items-center gap-1 text-xs mb-1 ${
                stat.requiredDaily > stat.dailyTarget * 1.5 ? 'text-red-600' : 'text-purple-600'
              }`}>
                <DollarSign size={12} />
                <span>Required/Day</span>
              </div>
              <p className={`font-semibold ${
                stat.requiredDaily > stat.dailyTarget * 1.5 ? 'text-red-900' : 'text-purple-900'
              }`}>
                {formatMVR(stat.requiredDaily)}
              </p>
              <p className={`text-xs ${
                stat.requiredDaily > stat.dailyTarget * 1.5 ? 'text-red-600' : 'text-purple-600'
              }`}>
                {stat.requiredDaily > stat.dailyTarget * 1.5 ? '⚠️ Above target!' : 
                 stat.requiredDaily > stat.dailyTarget ? '↑ Slightly above' : '✓ On track'}
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
  )
}
