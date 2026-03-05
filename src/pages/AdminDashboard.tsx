import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Users, LogIn, Calendar, TrendingUp, UserCheck, X } from 'lucide-react'

const ADMIN_EMAIL = 'rettey.ay@hotmail.com'

type UserData = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  raw_user_meta_data: Record<string, any>
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
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
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
      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('auth.users')
        .select('*')
      
      if (usersError) {
        // Try RPC method
        const { data: rpcUsers, error: rpcError } = await supabase
          .rpc('admin_get_all_users')
        
        if (rpcError) throw rpcError
        setUsers(rpcUsers || [])
      } else {
        setUsers(usersData || [])
      }

      // Load audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('auth.audit_log_entries')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(50)
      
      if (!logsError) {
        setAuditLogs(logsData || [])
      }
    } catch (e) {
      console.error('Failed to load admin data:', e)
      // Fallback - load from session
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUsers([{
          id: user.id,
          email: user.email || '',
          created_at: user.created_at || '',
          last_sign_in_at: user.last_sign_in_at || null,
          raw_user_meta_data: user.user_metadata || {}
        }])
      }
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
      }
    } catch (e) {
      console.error('Failed to load user stats:', e)
      setUserStats(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString()
  }

  const getActiveUsers = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) > thirtyDaysAgo).length
  }

  const getNewUsersThisMonth = () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return users.filter(u => new Date(u.created_at) >= monthStart).length
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-blue-600" size={20} />
            <span className="text-sm text-gray-600">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="text-emerald-600" size={20} />
            <span className="text-sm text-gray-600">Active (30d)</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{getActiveUsers()}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-amber-600" size={20} />
            <span className="text-sm text-gray-600">New This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{getNewUsersThisMonth()}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <LogIn className="text-purple-600" size={20} />
            <span className="text-sm text-gray-600">Last Login</span>
          </div>
          <p className="text-sm font-bold text-gray-900">
            {users.length > 0 
              ? formatDate(users.sort((a, b) => new Date(b.last_sign_in_at || 0).getTime() - new Date(a.last_sign_in_at || 0).getTime())[0]?.last_sign_in_at)
              : 'Never'
            }
          </p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="text-blue-600" size={20} />
          All Users
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

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-purple-600" size={20} />
            Recent Activity
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setUserStats(null)
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
