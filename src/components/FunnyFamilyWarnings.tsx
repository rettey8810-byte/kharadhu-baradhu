import { useMemo } from 'react'
import { AlertTriangle, Heart, Sparkles, Megaphone } from 'lucide-react'

interface FunnyFamilyWarningsProps {
  totalExpense: number
  totalIncome: number
  dailySafeSpend: number
  daysRemaining: number
  budget: number
  remainingBalance: number
  profileSpendings: { profile: { name: string; gender?: string }; totalSpent: number; transactionCount: number }[]
}

interface WarningMessage {
  id: string
  type: 'husband' | 'wife' | 'general' | 'critical'
  icon: React.ReactNode
  title: string
  message: string
  color: string
  bgColor: string
  condition: (stats: {
    totalExpense: number
    totalIncome: number
    dailySafeSpend: number
    daysRemaining: number
    budget: number
    remainingBalance: number
    spendingRatio: number
    isOverBudget: boolean
    transactionCount: number
    topSpender?: { profile: { name: string }; totalSpent: number }
  }) => boolean
}

const warningMessages: WarningMessage[] = [
  // Husband spending warnings
  {
    id: 'husband-second-wife',
    type: 'husband',
    icon: <Heart className="w-5 h-5" />,
    title: 'Future Prediction',
    message: 'If your husband keeps spending like this, he might need a 2nd wife to help pay the bills!',
    color: 'text-rose-600',
    bgColor: 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200',
    condition: (stats) => stats.spendingRatio > 0.7 && stats.isOverBudget
  },
  {
    id: 'husband-bankruptcy',
    type: 'husband',
    icon: <AlertTriangle className="w-5 h-5" />,
    title: 'Family Alert',
    message: 'Husband spending level: DIABOLICAL. Kids might start calling the neighbor "Daddy" soon.',
    color: 'text-orange-600',
    bgColor: 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200',
    condition: (stats) => stats.spendingRatio > 0.85
  },
  {
    id: 'husband-divorce',
    type: 'husband',
    icon: <Megaphone className="w-5 h-5" />,
    title: 'Warning',
    message: 'Wife has started Googling "how to hide assets before divorce". Slow down, sir!',
    color: 'text-red-600',
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200',
    condition: (stats) => stats.totalExpense > stats.totalIncome && stats.spendingRatio > 0.6
  },
  {
    id: 'husband-dinner',
    type: 'husband',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Culinary Prediction',
    message: 'At this spending rate, tonight\'s dinner will be "air with a side of imagination".',
    color: 'text-purple-600',
    bgColor: 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200',
    condition: (stats) => stats.remainingBalance < 100 && stats.remainingBalance > 0
  },
  
  // Wife spending warnings
  {
    id: 'wife-shopping',
    type: 'wife',
    icon: <Heart className="w-5 h-5" />,
    title: 'Shopping Alert',
    message: 'Wife\'s shopping spree detected. Husband is considering faking his own death.',
    color: 'text-fuchsia-600',
    bgColor: 'bg-gradient-to-r from-fuchsia-50 to-pink-50 border-fuchsia-200',
    condition: (stats) => !!(stats.topSpender?.profile.name.toLowerCase().includes('wife') && stats.spendingRatio > 0.6)
  },
  {
    id: 'wife-credit-cards',
    type: 'wife',
    icon: <AlertTriangle className="w-5 h-5" />,
    title: 'Card Alert',
    message: 'Credit cards are crying. Bank called to ask if cards were stolen. Nope, just wife!',
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200',
    condition: (stats) => stats.spendingRatio > 0.75 && stats.transactionCount > 15
  },
  {
    id: 'wife-shoes',
    type: 'wife',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Shoe Math',
    message: 'She has 50 pairs of shoes but "nothing to wear". Your wallet has nothing left either.',
    color: 'text-violet-600',
    bgColor: 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200',
    condition: (stats) => stats.spendingRatio > 0.5 && stats.transactionCount > 10
  },
  {
    id: 'wife-salon',
    type: 'wife',
    icon: <Megaphone className="w-5 h-5" />,
    title: 'Beauty Budget',
    message: 'Beauty treatments cost more than the car payment. But at least she\'ll look good in the bus!',
    color: 'text-indigo-600',
    bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200',
    condition: (stats) => stats.spendingRatio > 0.4 && stats.dailySafeSpend < 50
  },
  
  // General family warnings
  {
    id: 'general-no-money',
    type: 'general',
    icon: <AlertTriangle className="w-5 h-5" />,
    title: 'Family Meeting',
    message: 'Family budget status: We\'re now officially too broke to pay attention.',
    color: 'text-amber-600',
    bgColor: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
    condition: (stats) => stats.remainingBalance <= 0
  },
  {
    id: 'general-ramen',
    type: 'general',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Diet Plan',
    message: 'New family diet plan activated: Ramen noodles for breakfast, lunch, and dinner! Yum!',
    color: 'text-yellow-600',
    bgColor: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200',
    condition: (stats) => stats.remainingBalance > 0 && stats.remainingBalance < 200
  },
  {
    id: 'general-ghost',
    type: 'general',
    icon: <Heart className="w-5 h-5" />,
    title: 'Relationship Status',
    message: 'Money\'s gone but love remains... though love can\'t pay the electricity bill.',
    color: 'text-cyan-600',
    bgColor: 'bg-gradient-to-r from-cyan-50 to-teal-50 border-cyan-200',
    condition: (stats) => stats.totalExpense > stats.totalIncome * 0.9
  },
  {
    id: 'general-thief',
    type: 'general',
    icon: <Megaphone className="w-5 h-5" />,
    title: 'Security Alert',
    message: 'The only thing being stolen here is your financial future. Lock up the credit cards!',
    color: 'text-red-600',
    bgColor: 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200',
    condition: (stats) => stats.spendingRatio > 0.9
  },
  {
    id: 'general-rich',
    type: 'general',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Good News',
    message: 'You\'re saving so well! Your future self is doing a happy dance right now!',
    color: 'text-emerald-600',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200',
    condition: (stats) => stats.totalIncome > stats.totalExpense * 1.5
  },
  {
    id: 'general-lottery',
    type: 'general',
    icon: <Heart className="w-5 h-5" />,
    title: 'Hope Remains',
    message: 'Budget looking tight? Time to buy a lottery ticket! (Just kidding, keep budgeting!)',
    color: 'text-blue-600',
    bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
    condition: (stats) => stats.remainingBalance < 500 && stats.daysRemaining > 10
  }
]

export default function FunnyFamilyWarnings({
  totalExpense,
  totalIncome,
  dailySafeSpend,
  daysRemaining,
  budget,
  remainingBalance,
  profileSpendings
}: FunnyFamilyWarningsProps) {
  const { activeWarning, spendingRatio, isOverBudget, topSpender } = useMemo(() => {
    const ratio = budget > 0 ? totalExpense / budget : 0
    const overBudget = remainingBalance < 0
    const txCount = profileSpendings.reduce((sum, p) => sum + p.transactionCount, 0)
    const top = profileSpendings.length > 0 ? profileSpendings[0] : undefined

    const stats = {
      totalExpense,
      totalIncome,
      dailySafeSpend,
      daysRemaining,
      budget,
      remainingBalance,
      spendingRatio: ratio,
      isOverBudget: overBudget,
      transactionCount: txCount,
      topSpender: top
    }

    // Find all warnings that match current conditions
    const matchingWarnings = warningMessages.filter(w => w.condition(stats))
    
    // If no warnings match, show a random general one
    let selectedWarning: WarningMessage | null = null
    
    if (matchingWarnings.length > 0) {
      // Pick based on day of month to ensure it changes daily
      const dayOfMonth = new Date().getDate()
      selectedWarning = matchingWarnings[dayOfMonth % matchingWarnings.length]
    } else if (ratio > 0.3) {
      // Default warning if spending is significant
      selectedWarning = warningMessages.find(w => w.id === 'general-ghost') || null
    }

    return {
      activeWarning: selectedWarning,
      spendingRatio: ratio,
      isOverBudget: overBudget,
      topSpender: top
    }
  }, [totalExpense, totalIncome, dailySafeSpend, daysRemaining, budget, remainingBalance, profileSpendings])

  if (!activeWarning) return null

  return (
    <div className={`rounded-2xl p-5 shadow-lg border-2 ${activeWarning.bgColor} relative overflow-hidden`}>
      {/* Spotlight effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/30 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/20 rounded-full blur-xl" />
      
      <div className="relative">
        {/* Header with animated icon */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2.5 rounded-xl ${activeWarning.color} bg-white/80 shadow-sm animate-pulse`}>
            {activeWarning.icon}
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${activeWarning.color} opacity-80`}>
              {activeWarning.type === 'husband' ? 'Husband Alert' : 
               activeWarning.type === 'wife' ? 'Wife Alert' : 'Family Alert'}
            </p>
            <h3 className={`font-bold text-lg ${activeWarning.color}`}>
              {activeWarning.title}
            </h3>
          </div>
        </div>

        {/* Funny message */}
        <p className="text-gray-700 text-base leading-relaxed font-medium">
          {activeWarning.message}
        </p>

        {/* Stats summary */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Spent:</span>
            <span className="font-semibold text-gray-700">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(totalExpense)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Budget:</span>
            <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
              {spendingRatio > 0 ? `${(spendingRatio * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
          {topSpender && (
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <span className="text-gray-500">Top Spender:</span>
              <span className="font-semibold text-gray-700">
                {topSpender.profile.name}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar showing budget usage */}
        <div className="mt-4">
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${
                spendingRatio > 0.9 ? 'bg-red-500' : 
                spendingRatio > 0.7 ? 'bg-orange-500' : 
                spendingRatio > 0.5 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, spendingRatio * 100)}%` }}
            />
          </div>
        </div>

        {/* Daily message indicator */}
        <p className="mt-3 text-xs text-gray-500 italic">
          Message updates daily based on your spending pattern
        </p>
      </div>
    </div>
  )
}
