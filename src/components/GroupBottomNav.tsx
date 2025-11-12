import { useNavigate } from '@tanstack/react-router'
import { LayoutGrid, CreditCard, Plus, UserCheck, Settings } from 'lucide-react'
import { motion } from 'motion/react'

interface GroupBottomNavProps {
  groupId: string
  activeTab: 'expenses' | 'members' | 'balances' | 'activity' | 'settings'
  isOnChildRoute: boolean
  onTabChange: (tab: 'expenses' | 'members' | 'balances' | 'activity' | 'settings') => void
  onAddExpense: () => void
}

export function GroupBottomNav({
  groupId,
  activeTab,
  isOnChildRoute,
  onTabChange,
  onAddExpense,
}: GroupBottomNavProps) {
  const navigate = useNavigate()

  const handleTabClick = (tab: 'expenses' | 'members' | 'balances' | 'activity' | 'settings') => {
    if (isOnChildRoute) {
      navigate({ to: '/groups/$groupId', params: { groupId } })
    }
    onTabChange(tab)
  }

  const handleAddClick = () => {
    if (isOnChildRoute) {
      navigate({ to: '/groups/$groupId', params: { groupId } })
      // Use setTimeout to ensure navigation completes before opening drawer
      setTimeout(() => onAddExpense(), 100)
    } else {
      onAddExpense()
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'expenses', label: 'Transactions', icon: CreditCard },
    { id: 'add', label: 'Add', icon: Plus },
    { id: 'members', label: 'Members', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const getActiveTab = () => {
    if (isOnChildRoute) return 'expenses'
    return activeTab === 'overview' ? 'overview' : activeTab
  }

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50 pb-safe px-safe">
      <div className="max-w-7xl mx-auto px-2 pb-3">
        <div className="bg-[#101418] border border-[#10B981]/30 rounded-2xl shadow-2xl p-1 flex items-center justify-between relative">
          {tabs.map((tab) => {
            const isActive = getActiveTab() === tab.id
            const Icon = tab.icon
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'add') {
                    handleAddClick()
                  } else {
                    handleTabClick(tab.id as any)
                  }
                }}
                className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors relative z-10 ${
                  isActive && tab.id !== 'add'
                    ? 'text-white'
                    : tab.id === 'add'
                    ? 'text-[#10B981]'
                    : 'text-white/80'
                }`}
                whileTap={{ scale: tab.id === 'add' ? 0.9 : 0.95 }}
                whileHover={{ scale: tab.id === 'add' ? 1.1 : 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {isActive && tab.id !== 'add' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#10B981] rounded-xl shadow-lg"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <motion.div 
                  className="flex flex-col items-center gap-1 relative z-10"
                  animate={isActive && tab.id !== 'add' ? { y: -2 } : { y: 0 }}
                  whileHover={tab.id === 'add' ? { y: -3 } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Icon className={tab.id === 'add' ? 'w-5 h-5' : 'w-4 h-4'} />
                  <span className="text-[10px]">{tab.label}</span>
                </motion.div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
