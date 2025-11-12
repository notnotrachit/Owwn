import { useNavigate } from '@tanstack/react-router'
import { LayoutGrid, CreditCard, Plus, UserCheck, Settings } from 'lucide-react'

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

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50 pb-safe px-safe">
      <div className="max-w-7xl mx-auto px-2 pb-3">
        <div className="bg-[#101418] border border-[#10B981]/30 rounded-2xl shadow-2xl p-1 flex items-center justify-between">
          <button
            onClick={() => handleTabClick('overview' as any)}
            className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors ${
              activeTab === 'overview' && !isOnChildRoute
                ? 'bg-[#10B981] text-white shadow-lg'
                : 'text-white/80 hover:bg-[#10B981]/20'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[10px]">Overview</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('expenses')}
            className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors ${
              (activeTab === 'expenses' && !isOnChildRoute) || isOnChildRoute
                ? 'bg-[#10B981] text-white shadow-lg'
                : 'text-white/80 hover:bg-[#10B981]/20'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-[10px]">Transactions</span>
            </div>
          </button>

          <button
            onClick={handleAddClick}
            className="flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors text-[#10B981] hover:bg-[#10B981]/20"
          >
            <div className="flex flex-col items-center gap-1">
              <Plus className="w-5 h-5" />
              <span className="text-[10px]">Add</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('members')}
            className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors ${
              activeTab === 'members' && !isOnChildRoute
                ? 'bg-[#10B981] text-white shadow-lg'
                : 'text-white/80 hover:bg-[#10B981]/20'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <UserCheck className="w-4 h-4" />
              <span className="text-[10px]">Members</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('settings')}
            className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors ${
              activeTab === 'settings' && !isOnChildRoute
                ? 'bg-[#10B981] text-white shadow-lg'
                : 'text-white/80 hover:bg-[#10B981]/20'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Settings className="w-4 h-4" />
              <span className="text-[10px]">Settings</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
