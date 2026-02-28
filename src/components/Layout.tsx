import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, PlusCircle, PieChart, Bell, Menu, X, LogOut, Target, BarChart3, Users, Repeat, TrendingUp, Search, Calendar, Wallet, List, Moon, Sun, Download, Zap, UserPlus, Languages } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useTheme } from '../hooks/useTheme.tsx'
import { useLanguage } from '../hooks/useLanguage.tsx'

function NavItem({ to, label, icon: Icon, onMenuClose }: { to?: string; label: string; icon: any; onMenuClose?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const active = to && location.pathname === to
  
  const handleClick = () => {
    if (onMenuClose) {
      onMenuClose()
    }
    if (to && to !== location.pathname) {
      navigate(to)
    }
  }
  
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3 w-full text-left ${active ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { profiles, currentProfile, setCurrentProfile } = useProfile()
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage, t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
              <img src="/logo.png" alt="Kharadhu Baradhu" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-gray-900 truncate hidden sm:inline">{t('app_name')}</span>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-500">{t('active_profile')}</div>
            <select
              className="w-full min-w-0 text-sm font-semibold bg-white border border-gray-200 rounded-lg px-2 py-1"
              value={currentProfile?.id ?? ''}
              onChange={(e) => {
                const next = profiles.find(p => p.id === e.target.value)
                if (next) setCurrentProfile(next)
              }}
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className={`p-2 rounded-lg ${language === 'dv' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Toggle Dhivehi mode"
              type="button"
            >
              <Languages size={20} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Toggle dark mode"
              type="button"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link to="/reminders" className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Bell size={20} />
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 py-4 pb-28">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="max-w-xl mx-auto flex justify-around px-1">
          <Link to="/" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <Home size={22} />
            <span>{t('nav_home')}</span>
          </Link>
          <Link to="/add" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/add' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <PlusCircle size={22} />
            <span>{t('nav_add')}</span>
          </Link>
          <Link to="/charts" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/charts' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <PieChart size={22} />
            <span>{t('nav_charts')}</span>
          </Link>
          <Link to="/savings" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/savings' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <TrendingUp size={22} />
            <span>{t('nav_savings')}</span>
          </Link>
          <Link to="/profiles" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/profiles' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <Users size={22} />
            <span>{t('nav_profiles')}</span>
          </Link>
        </div>
        <div className="text-center pb-1">
          <span className="text-[10px] text-gray-400">Powered by Retts Web Dev</span>
        </div>
      </nav>

      {/* Side Menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-64 bg-white z-40 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                  <img src="/logo.png" alt="Kharadhu Baradhu" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-gray-900">{t('app_name')}</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <nav className="py-2">
              <NavItem to="/" label={t('menu_dashboard')} icon={Home} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/add" label={t('menu_add_transaction')} icon={PlusCircle} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/charts" label={t('menu_analytics')} icon={PieChart} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/savings" label={t('menu_savings_goals')} icon={TrendingUp} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/budget" label={t('menu_monthly_budget')} icon={Target} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/category-budgets" label={t('menu_category_budgets')} icon={BarChart3} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/recurring" label={t('menu_recurring_bills')} icon={Repeat} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/recurring-income" label={t('menu_recurring_income')} icon={TrendingUp} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/reminders" label={t('menu_reminders')} icon={Bell} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/transactions" label={t('menu_all_transactions')} icon={List} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/search" label={t('menu_search')} icon={Search} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/categories" label={t('menu_categories')} icon={PieChart} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/income-sources" label={t('menu_income_sources')} icon={Wallet} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/yearly" label={t('menu_yearly_view')} icon={BarChart3} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/compare" label={t('menu_monthly_compare')} icon={Calendar} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/export-reports" label={t('menu_export_reports')} icon={Download} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/quick-add" label={t('menu_quick_add')} icon={Zap} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/profile-sharing" label={t('menu_profile_sharing')} icon={UserPlus} onMenuClose={() => setMenuOpen(false)} />
              <NavItem to="/profiles" label={t('menu_profiles')} icon={Users} onMenuClose={() => setMenuOpen(false)} />
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <button
                onClick={signOut}
                className="flex items-center gap-3 text-red-600 w-full px-4 py-3 hover:bg-red-50 rounded-lg"
              >
                <LogOut size={20} />
                <span>{t('sign_out')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
