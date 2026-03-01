import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ProfileProvider } from './hooks/useProfile'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AddTransaction from './pages/AddTransaction'
import Categories from './pages/Categories'
import Budget from './pages/Budget'
import YearlyView from './pages/YearlyView'
import Login from './pages/Login'
import Profiles from './pages/Profiles'
import SavingsGoals from './pages/SavingsGoals'
import BillReminders from './pages/BillReminders'
import Charts from './pages/Charts'
import CategoryBudgets from './pages/CategoryBudgets'
import RecurringExpenses from './pages/RecurringExpenses'
import RecurringIncome from './pages/RecurringIncome'
import SearchTransactions from './pages/SearchTransactions'
import MonthlyComparison from './pages/MonthlyComparison'
import IncomeSources from './pages/IncomeSources'
import Transactions from './pages/Transactions'
import ExportReports from './pages/ExportReports'
import QuickAdd from './pages/QuickAdd'
import ProfileSharing from './pages/ProfileSharing'
import GroceryBills from './pages/GroceryBills'
import AcceptInvite from './pages/AcceptInvite'

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Accept Invite route - accessible without auth */}
        <Route path="/accept-invite" element={<AcceptInvite />} />
        
        {/* All other routes require auth */}
        <Route path="*" element={
          session ? (
            <ProfileProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/add" element={<AddTransaction />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/yearly" element={<YearlyView />} />
                  <Route path="/profiles" element={<Profiles />} />
                  <Route path="/savings" element={<SavingsGoals />} />
                  <Route path="/reminders" element={<BillReminders />} />
                  <Route path="/charts" element={<Charts />} />
                  <Route path="/category-budgets" element={<CategoryBudgets />} />
                  <Route path="/recurring" element={<RecurringExpenses />} />
                  <Route path="/recurring-income" element={<RecurringIncome />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/search" element={<SearchTransactions />} />
                  <Route path="/compare" element={<MonthlyComparison />} />
                  <Route path="/income-sources" element={<IncomeSources />} />
                  <Route path="/export-reports" element={<ExportReports />} />
                  <Route path="/quick-add" element={<QuickAdd />} />
                  <Route path="/profile-sharing" element={<ProfileSharing />} />
                  <Route path="/grocery-bills" element={<GroceryBills />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProfileProvider>
          ) : (
            <Login />
          )
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
