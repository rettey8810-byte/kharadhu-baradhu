import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, PlusCircle, PieChart, Bell, Menu, X, LogOut, Target, BarChart3, Users, Repeat, TrendingUp, Search, Calendar, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

function NavItem({ to, label, icon: Icon, onClick }: { to?: string; label: string; icon: any; onClick?: () => void }) {
  const location = useLocation()
  const active = to && location.pathname === to
  
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 w-full"
      >
        <Icon size={20} />
        <span>{label}</span>
      </button>
    )
  }
  
  return (
    <Link
      to={to!}
      className={`flex items-center gap-3 px-4 py-3 ${active ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { profiles, currentProfile, setCurrentProfile } = useProfile()
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
            <span className="font-bold text-gray-900 truncate">Kharadhu Baradhu</span>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-500">Active Profile</div>
            <select
              className="w-full text-sm font-semibold bg-white border border-gray-200 rounded-lg px-2 py-1"
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
            <span>Home</span>
          </Link>
          <Link to="/add" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/add' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <PlusCircle size={22} />
            <span>Add</span>
          </Link>
          <Link to="/charts" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/charts' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <PieChart size={22} />
            <span>Charts</span>
          </Link>
          <Link to="/savings" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/savings' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <TrendingUp size={22} />
            <span>Savings</span>
          </Link>
          <Link to="/profiles" className={`flex flex-col items-center py-2 px-3 text-xs ${location.pathname === '/profiles' ? 'text-emerald-600' : 'text-gray-500'}`}>
            <Users size={22} />
            <span>Profiles</span>
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
                <span className="font-bold text-gray-900">Kharadhu Baradhu</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <nav className="py-2">
              <NavItem to="/" label="Dashboard" icon={Home} onClick={() => setMenuOpen(false)} />
              <NavItem to="/add" label="Add Transaction" icon={PlusCircle} onClick={() => setMenuOpen(false)} />
              <NavItem to="/charts" label="Analytics" icon={PieChart} onClick={() => setMenuOpen(false)} />
              <NavItem to="/savings" label="Savings Goals" icon={TrendingUp} onClick={() => setMenuOpen(false)} />
              <NavItem to="/budget" label="Monthly Budget" icon={Target} onClick={() => setMenuOpen(false)} />
              <NavItem to="/category-budgets" label="Category Budgets" icon={BarChart3} onClick={() => setMenuOpen(false)} />
              <NavItem to="/recurring" label="Recurring Bills" icon={Repeat} onClick={() => setMenuOpen(false)} />
              <NavItem to="/reminders" label="Reminders" icon={Bell} onClick={() => setMenuOpen(false)} />
              <NavItem to="/search" label="Search" icon={Search} onClick={() => setMenuOpen(false)} />
              <NavItem to="/categories" label="Categories" icon={PieChart} onClick={() => setMenuOpen(false)} />
              <NavItem to="/income-sources" label="Income Sources" icon={Wallet} onClick={() => setMenuOpen(false)} />
              <NavItem to="/yearly" label="Yearly View" icon={BarChart3} onClick={() => setMenuOpen(false)} />
              <NavItem to="/compare" label="Monthly Compare" icon={Calendar} onClick={() => setMenuOpen(false)} />
              <NavItem to="/profiles" label="Profiles" icon={Users} onClick={() => setMenuOpen(false)} />
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <button
                onClick={signOut}
                className="flex items-center gap-3 text-red-600 w-full px-4 py-3 hover:bg-red-50 rounded-lg"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
