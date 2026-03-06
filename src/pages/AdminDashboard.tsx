import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Users, Calendar, TrendingUp, X, DollarSign, CreditCard, BarChart3, PieChart, Activity, Wallet } from 'lucide-react'

const ADMIN_EMAIL = 'retey.ay@hotmail.com'

type UserData = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  raw_user_meta_data: Record<string, any>
}

type SystemTotals = {
  total_income: number
  total_expense: number
  total_profit: number
  total_transactions: number
  total_users: number
  active_users_30d: number
  new_users_30d: number
}

type TopUser = {
  user_id: string
  email: string
  profile_name: string
  transaction_count: number
  total_income: number
  total_expense: number
  net_balance: number
  last_active: string
}

type DailyStat = {
  date: string
  new_users: number
  active_users: number
  transactions_count: number
  total_income: number
  total_expense: number
}

type ProfileStats = {
  total_profiles: number
  profiles_with_transactions: number
  avg_transactions_per_profile: number
  top_profile_type: string
  top_profile_count: number
}

type UserTransaction = {
  id: string
  transaction_date: string
  description: string
  amount: number
  type: string
  category_name: string
  created_at: string
}

type AuditLog = {
  id: string
  occurred_at: string
  action: string
  actor_email: string
  target_email: string | null
}

export default function AdminDashboard() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<UserData[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [systemTotals, setSystemTotals] = useState<SystemTotals | null>(null)
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics'>('overview')
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30)
  const [userStats, setUserStats] = useState<{
    transactions: number
    income: number
    expenses: number
    profiles: number
  } | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === ADMIN_EMAIL) {
      setIsAdmin(true)
      setCurrentUserEmail(user.email)
      await loadAdminData()
    } else {
      setIsAdmin(false)
    }
    setLoading(false)
  }

  const loadAdminData = async () => {
    try {
      setLoadError(null)

      // Load all users
      const { data: rpcUsers, error: usersErr } = await supabase.rpc('admin_get_all_users')
      if (usersErr) throw usersErr
      setUsers((rpcUsers || []) as any)

      // Load audit logs
      const { data: rpcLogs, error: logsErr } = await supabase.rpc('admin_get_audit_logs', { p_limit: 50 })
      if (logsErr) {
        setAuditLogs([])
      } else {
        setAuditLogs((rpcLogs || []) as any)
      }

      // Load system totals
      const { data: totalsData } = await supabase.rpc('admin_get_system_totals')
      if (totalsData && totalsData.length > 0) {
        setSystemTotals(totalsData[0] as any)
      }

      // Load top users
      const { data: topUsersData } = await supabase.rpc('admin_get_top_users', { p_limit: 10 })
      setTopUsers((topUsersData || []) as any)

      // Load daily stats
      const { data: dailyData } = await supabase.rpc('admin_get_daily_stats', { p_days: dateRange })
      setDailyStats((dailyData || []) as any)

      // Load profile stats
      const { data: profileData } = await supabase.rpc('admin_get_profile_stats')
      if (profileData && profileData.length > 0) {
        setProfileStats(profileData[0] as any)
      }
    } catch (e) {
      console.error('Failed to load admin data:', e)
      const msg =
        typeof e === 'object' && e && 'message' in e
          ? String((e as any).message)
          : JSON.stringify(e)
      setLoadError(msg || 'Failed to load admin data')
      setUsers([])
      setAuditLogs([])
    }
  }

  const viewUserDetails = async (user: UserData) => {
    setSelectedUser(user)
    
    try {
      // Get user's transaction stats
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileData) {
        const { count: txCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', profileData.id)

        const { data: incomeData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('profile_id', profileData.id)
          .eq('type', 'income')

        const { data: expenseData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('profile_id', profileData.id)
          .eq('type', 'expense')

        const totalIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
        const totalExpense = expenseData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

        setUserStats({
          transactions: txCount || 0,
          income: totalIncome,
          expenses: totalExpense,
          profiles: 1
        })

        // Load recent transactions for this user
        const { data: userTxData } = await supabase.rpc('admin_get_user_transactions', {
          p_user_id: user.id,
          p_limit: 20
        })
        setUserTransactions((userTxData || []) as any)
      }
    } catch (e) {
      console.error('Failed to load user stats:', e)
      setUserStats(null)
      setUserTransactions([])
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <Shield className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You are not authorized to access the Admin Dashboard.
          </p>
          <p className="text-sm text-gray-500">
            Logged in as: {currentUserEmail || 'Not logged in'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Admin email required: {ADMIN_EMAIL}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-emerald-600" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500">Manage users and view system analytics</p>
        </div>
        <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium">
          Admin: {currentUserEmail}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Analytics
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-800">Admin load error</p>
          <p className="text-xs text-red-700 mt-1 break-words">{loadError}</p>
          <p className="text-xs text-red-700 mt-2">
            This usually means the Supabase SQL functions were not created, have a wrong signature, or the admin email check blocked access.
          </p>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* System Totals */}
          {systemTotals && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="text-emerald-600" size={20} />
                System-Wide Financial Analytics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="text-emerald-600" size={18} />
                    <span className="text-xs text-emerald-700">Total Income (All Users)</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-900">
                    MVR {Number(systemTotals.total_income).toLocaleString()}
                  </p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="text-red-600" size={18} />
                    <span className="text-xs text-red-700">Total Expense (All Users)</span>
                  </div>
                  <p className="text-xl font-bold text-red-900">
                    MVR {Number(systemTotals.total_expense).toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="text-blue-600" size={18} />
                    <span className="text-xs text-blue-700">Total Profit (All Users)</span>
                  </div>
                  <p className={`text-xl font-bold ${Number(systemTotals.total_profit) >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                    MVR {Number(systemTotals.total_profit).toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="text-purple-600" size={18} />
                    <span className="text-xs text-purple-700">Total Transactions</span>
                  </div>
                  <p className="text-xl font-bold text-purple-900">{Number(systemTotals.total_transactions).toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="text-amber-600" size={18} />
                    <span className="text-xs text-amber-700">Total System Users</span>
                  </div>
                  <p className="text-xl font-bold text-amber-900">{systemTotals.total_users}</p>
                </div>
                <div className="bg-cyan-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PieChart className="text-cyan-600" size={18} />
                    <span className="text-xs text-cyan-700">Active (30d) / New (30d)</span>
                  </div>
                  <p className="text-xl font-bold text-cyan-900">
                    {systemTotals.active_users_30d} / {systemTotals.new_users_30d}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Stats */}
          {profileStats && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="text-indigo-600" size={20} />
                Profile Statistics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs text-indigo-700 mb-1">Total Profiles</p>
                  <p className="text-2xl font-bold text-indigo-900">{profileStats.total_profiles}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs text-emerald-700 mb-1">Profiles with Transactions</p>
                  <p className="text-2xl font-bold text-emerald-900">{profileStats.profiles_with_transactions}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs text-amber-700 mb-1">Avg Tx per Profile</p>
                  <p className="text-2xl font-bold text-amber-900">{profileStats.avg_transactions_per_profile}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-700 mb-1">Top Profile Type</p>
                  <p className="text-lg font-bold text-blue-900 truncate">{profileStats.top_profile_type}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {/* Top Users */}
          {topUsers.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="text-emerald-600" size={20} />
                Top 10 Users by Activity
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Profile</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Transactions</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Income</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Expense</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u) => (
                      <tr key={u.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{u.email}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.profile_name}</td>
                        <td className="py-3 px-4 text-sm text-center text-gray-900">{u.transaction_count}</td>
                        <td className="py-3 px-4 text-sm text-right text-emerald-700">
                          MVR {Number(u.total_income).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-red-700">
                          MVR {Number(u.total_expense).toLocaleString()}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-medium ${
                          Number(u.net_balance) >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          MVR {Number(u.net_balance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Users List */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              All Users ({users.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Last Login</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{user.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(user.created_at)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(user.last_sign_in_at)}</td>
                      <td className="py-3 px-4">
                        {user.last_sign_in_at ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => viewUserDetails(user)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {/* Daily Stats */}
          {dailyStats.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={20} />
                  Daily Activity Stats
                </h2>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(Number(e.target.value) as 7 | 30 | 90)}
                  className="px-3 py-1 rounded-lg border border-gray-300 text-sm"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">New Users</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Active Users</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Transactions</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Income</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Expense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStats.slice(0, 14).map((stat) => (
                      <tr key={stat.date} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(stat.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-emerald-700">{stat.new_users}</td>
                        <td className="py-3 px-4 text-sm text-center text-blue-700">{stat.active_users}</td>
                        <td className="py-3 px-4 text-sm text-center text-purple-700">{stat.transactions_count}</td>
                        <td className="py-3 px-4 text-sm text-right text-emerald-700">
                          MVR {Number(stat.total_income).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-red-700">
                          MVR {Number(stat.total_expense).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Log */}
          {auditLogs.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="text-purple-600" size={20} />
                Recent Activity (Audit Log)
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditLogs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-500">{formatDate(log.occurred_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{log.actor_email}</p>
                      {log.target_email && (
                        <p className="text-xs text-gray-500">Target: {log.target_email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setUserStats(null)
                  setUserTransactions([])
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-900">{selectedUser.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Last Login</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedUser.last_sign_in_at)}</p>
                </div>
              </div>

              {userStats && (
                <>
                  <h3 className="font-semibold text-gray-900 mt-4">Activity Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-600 mb-1">Transactions</p>
                      <p className="text-lg font-bold text-blue-900">{userStats.transactions}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-emerald-600 mb-1">Total Income</p>
                      <p className="text-lg font-bold text-emerald-900">MVR {userStats.income.toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-xs text-red-600 mb-1">Total Expenses</p>
                      <p className="text-lg font-bold text-red-900">MVR {userStats.expenses.toLocaleString()}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-xs text-amber-600 mb-1">Net</p>
                      <p className={`text-lg font-bold ${userStats.income - userStats.expenses >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                        MVR {(userStats.income - userStats.expenses).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* User Transactions */}
              {userTransactions.length > 0 && (
                <>
                  <h3 className="font-semibold text-gray-900 mt-4">Recent Transactions</h3>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Date</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Description</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Category</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-gray-600">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                            <td className="py-2 px-3 text-gray-900">{tx.description}</td>
                            <td className="py-2 px-3 text-gray-600">{tx.category_name || '-'}</td>
                            <td className={`py-2 px-3 text-right font-medium ${
                              tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {tx.type === 'income' ? '+' : '-'} MVR {Number(tx.amount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">User ID</p>
                <p className="text-xs font-mono text-gray-600 break-all">{selectedUser.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
