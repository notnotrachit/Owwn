import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '~/lib/auth-context'
import { useMutation, useConvex } from 'convex/react'
import { useState, useRef } from 'react'
import { ArrowLeft, Plus, Users, Receipt, DollarSign, TrendingUp, UserPlus, X, Search, Check, LayoutGrid, CreditCard, UserCheck, Settings, ChevronsUpDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from '~/components/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '~/components/ui/command'
import { Checkbox } from '~/components/ui/checkbox'

function GroupDetailSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#0A0F12]">
      <header className="bg-[#101418]/80 backdrop-blur-md shadow-lg border-b border-[#10B981]/30 sticky top-0 z-40 pt-safe px-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg animate-pulse" />
              <div className="w-40 h-6 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="w-32 h-10 bg-white/10 rounded-xl animate-pulse" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#101418] rounded-2xl shadow-xl p-8 mb-6 border border-[#10B981]/30">
          <div className="text-center py-8">
            <div className="w-32 h-32 mx-auto bg-white/10 rounded-full animate-pulse mb-4" />
            <div className="w-48 h-8 mx-auto bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  )
}

export const Route = createFileRoute('/groups/$groupId')({
  component: GroupDetail,
  pendingComponent: GroupDetailSkeleton,
})

function GroupDetail() {
  const { groupId } = Route.useParams()
  const { user, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'members' | 'settings'>('overview')
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  const tabs = ['overview', 'expenses', 'members', 'settings'] as const
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const trackingRef = useRef(false)
  const swipedRef = useRef(false)

  const goNextTab = () => {
    const i = tabs.indexOf(activeTab)
    if (i < tabs.length - 1) setActiveTab(tabs[i + 1])
  }
  const goPrevTab = () => {
    const i = tabs.indexOf(activeTab)
    if (i > 0) setActiveTab(tabs[i - 1])
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    startXRef.current = t.clientX
    startYRef.current = t.clientY
    trackingRef.current = true
    swipedRef.current = false
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!trackingRef.current || swipedRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - startXRef.current
    const dy = t.clientY - startYRef.current
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    if (dx < 0) goNextTab()
    else goPrevTab()
    swipedRef.current = true
  }
  const handleTouchEnd = () => {
    trackingRef.current = false
  }

  const { data: group } = useSuspenseQuery(
    convexQuery(api.groups.getGroupDetails, { groupId: groupId as any })
  )

  const { data: expenses } = useSuspenseQuery(
    convexQuery(api.expenses.getGroupExpenses, { groupId: groupId as any })
  )

  const { data: balances } = useSuspenseQuery(
    convexQuery(api.expenses.getGroupBalances, { groupId: groupId as any })
  )

  // Show loading skeleton while auth is loading
  if (isAuthLoading) {
    return <GroupDetailSkeleton />
  }

  // If no user after loading, show auth required state
  if (!user) {
    return (
      <motion.div 
        className="min-h-[100dvh] bg-[#0A0F12] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-white/70 mb-4">Please sign in to view this group.</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2 px-6 rounded-xl transition-all shadow-lg"
          >
            Go to Sign In
          </button>
        </div>
      </motion.div>
    )
  }

  // If no group found, show error state
  if (!group) {
    return (
      <motion.div 
        className="min-h-[100dvh] bg-[#0A0F12] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Group not found</h2>
          <p className="text-white/70 mb-4">This group doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2 px-6 rounded-xl transition-all shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>
    )
  }

  const userBalance = balances.balances.find((b) => b.userId === user._id)

  return (
    <motion.div 
      className="min-h-[100dvh] bg-[#0A0F12]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <header className="bg-[#101418]/80 backdrop-blur-md shadow-lg border-b border-[#10B981]/30 sticky top-0 z-40 pt-safe px-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate({ to: '/' })}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#10B981] text-white flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-sm text-white/70">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-[#10B981]/20 rounded-lg border border-[#10B981]/30">
                <Users className="w-4 h-4 text-white/70" />
                <span className="text-sm font-medium text-white">
                  {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <button
                onClick={() => setShowAddExpense(true)}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2 px-4 sm:px-6 rounded-xl transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Expense</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 md:pb-8" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {/* Tab Navigation - Improved with smooth animations */}
        <div className="hidden md:block bg-[#101418] rounded-2xl shadow-lg p-1.5 mb-6 border border-[#10B981]/30">
          <div className="grid grid-cols-3 gap-2 relative">
            <button
              onClick={() => setActiveTab('overview')}
              className={`relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold transition-colors z-10 ${
                activeTab === 'overview'
                  ? 'text-white'
                  : 'text-white/70 hover:text-white hover:bg-[#10B981]/20'
              }`}
            >
              {activeTab === 'overview' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#10B981] rounded-xl shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <LayoutGrid className="w-5 h-5 relative z-10" />
              <span className="hidden sm:inline relative z-10">Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold transition-colors z-10 ${
                activeTab === 'expenses'
                  ? 'text-white'
                  : 'text-white/70 hover:text-white hover:bg-[#10B981]/20'
              }`}
            >
              {activeTab === 'expenses' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#10B981] rounded-xl shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <CreditCard className="w-5 h-5 relative z-10" />
              <span className="hidden sm:inline relative z-10">Expenses</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold transition-colors z-10 ${
                activeTab === 'members'
                  ? 'text-white'
                  : 'text-white/70 hover:text-white hover:bg-[#10B981]/20'
              }`}
            >
              {activeTab === 'members' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#10B981] rounded-xl shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <UserCheck className="w-5 h-5 relative z-10" />
              <span className="hidden sm:inline relative z-10">Members</span>
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Balance Summary */}
            <div className="bg-[#101418] rounded-2xl shadow-xl p-8 mb-8 border border-[#10B981]/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#10B981] text-white flex items-center justify-center shadow-md">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              Your Balance
            </h2>
          </div>
          {userBalance ? (
            <div className="text-center py-4">
              <div
                className={`text-5xl sm:text-6xl font-bold mb-3 ${
                  userBalance.balance > 0
                    ? 'text-green-600 dark:text-green-400'
                    : userBalance.balance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {group.currencySymbol || '$'}{(Math.abs(userBalance.balance) / 100).toFixed(2)}
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#10B981]/20 border border-[#10B981]/30">
                <TrendingUp className={`w-5 h-5 ${
                  userBalance.balance > 0
                    ? 'text-green-600 dark:text-green-400'
                    : userBalance.balance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className="text-lg font-medium text-white">
                  {userBalance.balance > 0
                    ? 'You are owed'
                    : userBalance.balance < 0
                      ? 'You owe'
                      : 'All settled up!'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-white/70">
                No expenses yet
              </p>
              <p className="text-sm text-white/50 mt-2">
                Add your first expense to get started
              </p>
            </div>
          )}
        </div>

        {/* Suggested Settlements */}
        {balances.settlements.length > 0 && (
          <div className="bg-[#101418] rounded-xl shadow-lg p-6 border border-[#10B981]/30">
            <h2 className="text-xl font-semibold text-white mb-4">
              Suggested Settlements
            </h2>
            <div className="space-y-3">
              {balances.settlements.map((settlement, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-[#10B981]/10 rounded-lg border border-[#10B981]/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">
                      {settlement.fromName}
                    </span>
                    <span className="text-white/50">→</span>
                    <span className="text-white font-medium">
                      {settlement.toName}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-[#10B981]">
                    {group.currencySymbol || '$'}{(settlement.amount / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="bg-[#101418] rounded-xl shadow-lg p-6 border border-[#10B981]/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                All Expenses
              </h2>
              <button
                onClick={() => setShowAddExpense(true)}
                className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-16 text-white/70">
                <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No expenses yet</p>
                <p className="text-sm">Add your first expense to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense, index) => (
                  <motion.div
                    key={expense._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    className="p-5 bg-[#10B981]/10 rounded-lg border border-[#10B981]/20 hover:border-[#10B981]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-white mb-1">
                          {expense.description}
                        </div>
                        <div className="text-sm text-white/70">
                          Paid by <span className="font-medium">{expense.paidByName}</span> •{' '}
                          {new Date(expense.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-[#10B981]">
                        {group.currencySymbol || '$'}{(expense.amount / 100).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Users className="w-3.5 h-3.5" />
                      Split between {expense.splits.length} {expense.splits.length === 1 ? 'person' : 'people'}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-[#101418] rounded-xl shadow-lg p-6 border border-[#10B981]/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Members ({group.members.length})
            </h2>
            <button
              onClick={() => setShowAddMember(true)}
              className="text-sm text-[#10B981] hover:text-[#059669] transition-colors font-medium"
            >
              + Add Member
            </button>
          </div>
          <div className="space-y-2">
            {group.members.map((member: any, index: number) => {
              const memberBalance = balances.balances.find(
                (b) => b.userId === member._id
              )
              const displayName = member.name || member.email || 'Unknown User'
              return (
                <motion.div
                  key={member._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex items-center justify-between p-3 bg-[#10B981]/10 rounded-lg border border-[#10B981]/20"
                >
                  <div>
                    <div className="font-medium text-white">
                      {displayName}
                      {member.role === 'admin' && (
                        <span className="ml-2 text-xs bg-[#10B981] text-white px-2 py-0.5 rounded shadow-sm">
                          Admin
                        </span>
                      )}
                    </div>
                    {member.name && member.email && (
                      <div className="text-sm text-white/70">
                        {member.email}
                      </div>
                    )}
                  </div>
                  {memberBalance && (
                    <div
                      className={`font-semibold ${
                        memberBalance.balance > 0
                          ? 'text-green-600 dark:text-green-400'
                          : memberBalance.balance < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {memberBalance.balance > 0 ? '+' : ''}{group.currencySymbol || '$'}
                      {(Math.abs(memberBalance.balance) / 100).toFixed(2)}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-[#101418] rounded-xl shadow-lg p-6 border border-[#10B981]/30">
            <h2 className="text-xl font-semibold text-white mb-6">Group Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  defaultValue={group.name}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white placeholder-white/40 transition-all"
                  placeholder="Group name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  defaultValue={group.description || ''}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white placeholder-white/40 transition-all"
                  placeholder="Group description"
                  rows={3}
                />
              </div>
              <button
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add Expense Drawer - Mobile */}
      <Drawer open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DrawerContent className="bg-[#101418] border-t border-[#10B981]/30 px-2">
          <AddExpenseDrawer
            groupId={groupId as any}
            members={group.members}
            currentUserId={user._id}
            currencySymbol={group.currencySymbol || "$"}
            currencyCode={group.currency || "USD"}
            onClose={() => setShowAddExpense(false)}
          />
        </DrawerContent>
      </Drawer>

      {/* Add Expense Modal - Desktop only */}
      <AnimatePresence>
        {showAddExpense && (
          <div className="hidden md:block">
            <AddExpenseModal
              groupId={groupId as any}
              members={group.members}
              currentUserId={user._id}
              currencySymbol={group.currencySymbol || "$"}
              currencyCode={group.currency || "USD"}
              onClose={() => setShowAddExpense(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <AddMemberModal
            groupId={groupId as any}
            currentUserId={user._id}
            onClose={() => setShowAddMember(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar - Mobile (5 tabs) */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 pb-safe px-safe">
        <div className="max-w-7xl mx-auto px-2 pb-3">
          <div className="bg-[#101418] border border-[#10B981]/30 rounded-2xl shadow-2xl p-1 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors ${
                activeTab === 'overview' ? 'bg-[#10B981] text-white shadow-lg' : 'text-white/80 hover:bg-[#10B981]/20'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[10px]">Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors ${
                activeTab === 'expenses' ? 'bg-[#10B981] text-white shadow-lg' : 'text-white/80 hover:bg-[#10B981]/20'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px]">Expenses</span>
              </div>
            </button>
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors text-[#10B981] hover:bg-[#10B981]/20"
            >
              <div className="flex flex-col items-center gap-1">
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">Add</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors ${
                activeTab === 'members' ? 'bg-[#10B981] text-white shadow-lg' : 'text-white/80 hover:bg-[#10B981]/20'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <UserCheck className="w-4 h-4" />
                <span className="text-[10px]">Members</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2.5 mx-0.5 rounded-xl text-center transition-colors ${
                activeTab === 'settings' ? 'bg-[#10B981] text-white shadow-lg' : 'text-white/80 hover:bg-[#10B981]/20'
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
    </motion.div>
  )
}

function AddExpenseDrawer({
  groupId,
  members,
  currentUserId,
  currencySymbol,
  currencyCode,
  onClose,
}: {
  groupId: any
  members: any[]
  currentUserId: any
  currencySymbol: string
  currencyCode: string
  onClose: () => void
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitBetween, setSplitBetween] = useState<string[]>(members.map((m: any) => m._id))
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal')
  const [exactValues, setExactValues] = useState<Record<string, string>>({})
  const [percentValues, setPercentValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>('')
  const [splitDrawerOpen, setSplitDrawerOpen] = useState(false)
  const createExpense = useMutation(api.expenses.createExpense)

  const categories = [
    { value: 'food', label: 'Food' },
    { value: 'transport', label: 'Transport' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'other', label: 'Other' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!description || !amount || !paidBy || splitBetween.length === 0) {
      setFormError('Please fill all required fields and select at least one member.')
      return
    }

    try {
      const totalCents = Math.round(parseFloat(amount) * 100)
      if (!isFinite(totalCents) || totalCents <= 0) {
        setFormError('Enter a valid amount.')
        return
      }

      let splits: { userId: any; amount: number }[] = []
      if (splitType === 'equal') {
        const n = splitBetween.length
        const base = Math.floor(totalCents / n)
        let remainder = totalCents - base * n
        splits = splitBetween.map((id) => {
          const extra = remainder > 0 ? 1 : 0
          if (remainder > 0) remainder -= 1
          return { userId: id as any, amount: base + extra }
        })
      } else if (splitType === 'custom') {
        let sum = 0
        splits = splitBetween.map((id) => {
          const v = Math.round(parseFloat(exactValues[id] || '0') * 100)
          sum += v
          return { userId: id as any, amount: v }
        })
        if (sum !== totalCents) {
          setFormError('Exact amounts must add up to the total amount.')
          return
        }
      } else {
        // percentage
        let pctSum = 0
        const raw = splitBetween.map((id) => {
          const p = parseFloat(percentValues[id] || '0')
          pctSum += isFinite(p) ? p : 0
          return { id, p: isFinite(p) ? p : 0 }
        })
        // Allow a small epsilon for 100%
        if (Math.abs(pctSum - 100) > 0.01) {
          setFormError('Percentages must add up to 100%.')
          return
        }
        // compute amounts, distribute rounding remainder
        let allocated = 0
        splits = raw.map(({ id, p }) => {
          const cents = Math.floor((p / 100) * totalCents)
          allocated += cents
          return { userId: id as any, amount: cents }
        })
        let remainder = totalCents - allocated
        for (let i = 0; i < splits.length && remainder > 0; i++) {
          splits[i].amount += 1
          remainder--
        }
      }

      await createExpense({
        groupId,
        description,
        amount: totalCents,
        paidBy: paidBy as any,
        currency: currencyCode,
        date: Date.now(),
        splitType,
        category: category || undefined,
        splits,
      })
      setDescription('')
      setAmount('')
      setCategory('')
      setPaidBy(currentUserId)
      setSplitBetween(members.map((m: any) => m._id))
      setSplitType('equal')
      setExactValues({})
      setPercentValues({})
      onClose()
    } catch (error) {
      console.error('Failed to add expense:', error)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 pb-12 max-h-[75dvh] overflow-y-auto overscroll-contain">
      <h2 className="text-xl font-bold text-white mb-6">Add Expense</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Description *
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white placeholder-white/40 transition-all text-sm"
            placeholder="e.g., Dinner, Gas"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Amount ({currencySymbol}) *
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white placeholder-white/40 transition-all text-sm"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Category
          </label>
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-full px-4 py-2.5 border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white transition-all text-sm flex items-center justify-between"
              >
                {category
                  ? categories.find((cat) => cat.value === category)?.label
                  : 'Select category...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-[#111827] border border-[#10B981]/30">
              <Command className="bg-[#111827]">
                <CommandInput placeholder="Search category..." className="text-white" />
                <CommandList>
                  <CommandEmpty className="text-white/60">No category found.</CommandEmpty>
                  <CommandGroup>
                    {categories.map((cat) => (
                      <CommandItem
                        key={cat.value}
                        value={cat.value}
                        onSelect={(currentValue) => {
                          setCategory(currentValue === category ? '' : currentValue)
                          setCategoryOpen(false)
                        }}
                        className="text-white hover:bg-[#10B981]/20 cursor-pointer"
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            category === cat.value ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        {cat.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Paid by *
          </label>
          <div className="relative">
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white appearance-none cursor-pointer transition-all text-sm pr-10"
              required
            >
              {members.map((member: any) => (
                <option key={member._id} value={member._id} className="bg-[#111827] text-white">
                  {member.name || member.email}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Split type field */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Split *
          </label>
          <button
            type="button"
            onClick={() => setSplitDrawerOpen(true)}
            className="w-full px-4 py-2.5 border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white transition-all text-sm flex items-center justify-between"
          >
            <span>
              {splitType === 'equal' && 'Split Equally'}
              {splitType === 'custom' && 'Split by Exact Values'}
              {splitType === 'percentage' && 'Split by Percentage'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </div>

        {formError && (
          <div className="text-red-400 text-sm">{formError}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-[#10B981]/30 text-white rounded-xl hover:bg-[#10B981]/10 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </form>

      {/* Nested Split Configuration Drawer */}
      <Drawer open={splitDrawerOpen} onOpenChange={setSplitDrawerOpen}>
        <DrawerContent className="bg-[#0A0F12] border-t border-[#10B981]/30">
          <div className="w-full max-w-md mx-auto px-4 py-6 pb-12">
            <h3 className="text-lg font-bold text-white mb-4">Configure Split</h3>
            
            <div className="space-y-4">
              {/* Split type selector */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitType('equal')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-colors text-left ${
                    splitType === 'equal'
                      ? 'bg-[#10B981] text-white border-[#10B981]'
                      : 'bg-[#111827] text-white/80 border-[#10B981]/30 hover:bg-[#10B981]/10'
                  }`}
                >
                  <div className="font-semibold">Split Equally</div>
                  <div className="text-xs opacity-70 mt-1">Divide amount equally among selected members</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('custom')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-colors text-left ${
                    splitType === 'custom'
                      ? 'bg-[#10B981] text-white border-[#10B981]'
                      : 'bg-[#111827] text-white/80 border-[#10B981]/30 hover:bg-[#10B981]/10'
                  }`}
                >
                  <div className="font-semibold">Split by Exact Values</div>
                  <div className="text-xs opacity-70 mt-1">Enter exact amount for each member</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('percentage')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-colors text-left ${
                    splitType === 'percentage'
                      ? 'bg-[#10B981] text-white border-[#10B981]'
                      : 'bg-[#111827] text-white/80 border-[#10B981]/30 hover:bg-[#10B981]/10'
                  }`}
                >
                  <div className="font-semibold">Split by Percentage</div>
                  <div className="text-xs opacity-70 mt-1">Enter percentage for each member</div>
                </button>
              </div>

              {/* Show member selection for equal split */}
              {splitType === 'equal' && (
                <div className="mt-4 space-y-2 border-t border-[#10B981]/30 pt-4">
                  <div className="text-sm font-medium text-white mb-2">Split between:</div>
                  {members.map((member: any) => {
                    const totalAmount = parseFloat(amount) || 0
                    const perPersonAmount = splitBetween.length > 0 ? totalAmount / splitBetween.length : 0
                    const isSelected = splitBetween.includes(member._id)
                    
                    return (
                      <div key={member._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#10B981]/10 transition-colors">
                        <Checkbox
                          id={`equal-${member._id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSplitBetween([...splitBetween, member._id])
                            } else {
                              setSplitBetween(splitBetween.filter(id => id !== member._id))
                            }
                          }}
                        />
                        <label
                          htmlFor={`equal-${member._id}`}
                          className="text-sm text-white/80 cursor-pointer flex-1"
                        >
                          {member.name || member.email}
                        </label>
                        {isSelected && totalAmount > 0 && (
                          <span className="text-sm font-medium text-[#10B981]">
                            {currencySymbol}{perPersonAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setSplitDrawerOpen(false)}
                    className="w-full mt-4 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Show input fields for custom/percentage */}
              {splitType === 'custom' && (
                <div className="mt-4 space-y-2 border-t border-[#10B981]/30 pt-4">
                  <div className="text-sm font-medium text-white mb-2">Enter amounts:</div>
                  {splitBetween.map((id) => {
                    const m = members.find((mm: any) => mm._id === id)
                    return (
                      <div key={id} className="grid grid-cols-2 gap-3 items-center">
                        <div className="text-sm text-white/80 truncate">{m?.name || m?.email}</div>
                        <input
                          type="number"
                          step="0.01"
                          value={exactValues[id] ?? ''}
                          onChange={(e) => setExactValues({ ...exactValues, [id]: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-[#10B981]/30 rounded-lg bg-[#111827] text-white text-sm focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981]"
                          placeholder={`0.00 ${currencySymbol}`}
                        />
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setSplitDrawerOpen(false)}
                    className="w-full mt-4 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
              
              {splitType === 'percentage' && (
                <div className="mt-4 space-y-2 border-t border-[#10B981]/30 pt-4">
                  <div className="text-sm font-medium text-white mb-2">Enter percentages:</div>
                  {splitBetween.map((id) => {
                    const m = members.find((mm: any) => mm._id === id)
                    return (
                      <div key={id} className="grid grid-cols-2 gap-3 items-center">
                        <div className="text-sm text-white/80 truncate">{m?.name || m?.email}</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={percentValues[id] ?? ''}
                            onChange={(e) => setPercentValues({ ...percentValues, [id]: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-[#10B981]/30 rounded-lg bg-[#111827] text-white text-sm focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981]"
                            placeholder="0"
                          />
                          <span className="text-white/70 text-sm">%</span>
                        </div>
                      </div>
                    )
                  })}
                  <div className="text-xs text-white/60 mt-2">Percentages must sum to 100%.</div>
                  <button
                    type="button"
                    onClick={() => setSplitDrawerOpen(false)}
                    className="w-full mt-4 bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function AddExpenseModal({
  groupId,
  members,
  currentUserId,
  currencySymbol,
  currencyCode,
  onClose,
}: {
  groupId: any
  members: any[]
  currentUserId: any
  currencySymbol: string
  currencyCode: string
  onClose: () => void
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const splitType = 'equal' as const
  const [selectedMembers, setSelectedMembers] = useState<any[]>(
    members.map((m) => m._id)
  )
  const [splitMode, setSplitMode] = useState<'everyone' | 'custom'>('everyone')

  const createExpense = useMutation(api.expenses.createExpense)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount) return

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100)
      await createExpense({
        groupId,
        description,
        amount: amountInCents,
        currency: currencyCode,
        paidBy,
        date: Date.now(),
        splitType,
        splits: selectedMembers.map((userId) => ({
          userId,
          amount: 0, // Will be calculated based on splitType
        })),
      })
      onClose()
    } catch (error) {
      console.error('Failed to create expense:', error)
    }
  }

  const toggleMember = (memberId: any) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId))
    } else {
      setSelectedMembers([...selectedMembers, memberId])
    }
  }

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 md:flex md:items-center md:justify-center md:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Mobile: Full screen, Desktop: Modal */}
      <motion.div 
        className="h-full md:h-auto bg-[#101418] md:rounded-2xl md:shadow-2xl md:max-w-lg w-full flex flex-col md:max-h-[90vh]"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#101418] border-b border-[#10B981]/30 px-4 sm:px-6 py-4 flex items-center justify-between z-10 pt-safe px-safe">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Add Expense
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#10B981]/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white/70" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                What was it for?
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3.5 text-base border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white placeholder-white/40 transition-all"
                placeholder="e.g., Dinner, Groceries, Movie tickets"
                required
                autoFocus
              />
            </div>

            {/* Amount - Most prominent */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/50">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white placeholder-white/40 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#10B981]/20"></div>

            {/* Paid by */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Who paid?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {members.map((member) => (
                  <button
                    key={member._id}
                    type="button"
                    onClick={() => setPaidBy(member._id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      paidBy === member._id
                        ? 'border-[#10B981] bg-[#10B981]/20'
                        : 'border-[#10B981]/30 hover:border-[#10B981]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paidBy === member._id
                          ? 'border-[#10B981]'
                          : 'border-white/30'
                      }`}>
                        {paidBy === member._id && (
                          <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                        )}
                      </div>
                      <span className="font-medium text-white">
                        {member.name || member.email || 'Unknown User'}
                        {member._id === currentUserId && (
                          <span className="ml-2 text-sm text-white/50">(You)</span>
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#10B981]/20"></div>

            {/* Split between */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Split between
              </label>
              
              {/* Quick Split Options */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('everyone')
                    setSelectedMembers(members.map(m => m._id))
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                    splitMode === 'everyone'
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#111827] text-white/70 hover:bg-[#111827]/70'
                  }`}
                >
                  Everyone
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('custom')}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                    splitMode === 'custom'
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#111827] text-white/70 hover:bg-[#111827]/70'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Member Selection */}
              {splitMode === 'custom' && (
                <div className="grid grid-cols-1 gap-2">
                  {members.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      onClick={() => toggleMember(member._id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedMembers.includes(member._id)
                          ? 'border-[#10B981] bg-[#10B981]/20'
                          : 'border-[#10B981]/30 hover:border-[#10B981]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedMembers.includes(member._id)
                          ? 'border-[#10B981] bg-[#10B981]'
                          : 'border-white/30'
                      }`}>
                        {selectedMembers.includes(member._id) && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                        </div>
                        <span className="font-medium text-white">
                          {member.name || member.email || 'Unknown User'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Split Preview */}
              {selectedMembers.length > 0 && amount && (
                <div className="mt-4 p-4 bg-[#10B981]/10 rounded-xl border border-[#10B981]/20">
                  <p className="text-sm text-white/70 mb-1">
                    Each person pays
                  </p>
                  <p className="text-xl font-bold text-[#10B981]">
                    {currencySymbol}{(parseFloat(amount) / selectedMembers.length).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-[#101418] border-t border-[#10B981]/30 p-4 sm:p-6 pb-safe px-safe">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 text-base font-semibold border-2 border-[#10B981]/30 text-white rounded-xl hover:bg-[#10B981]/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={selectedMembers.length === 0 || !amount || !description}
              className="flex-1 py-4 px-6 text-base font-bold bg-[#10B981] hover:bg-[#059669] disabled:bg-[#10B981]/30 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              Add Expense
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AddMemberModal({
  groupId,
  currentUserId,
  onClose,
}: {
  groupId: any
  currentUserId: any
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  const convex = useConvex()
  const addMember = useMutation(api.groups.addGroupMember)

  const handleSearch = async () => {
    if (!email) return
    
    setIsSearching(true)
    setError('')
    try {
      const results = await convex.query(api.users.searchUsersByEmail, { emailQuery: email })
      setSearchResults(results)
      if (results.length === 0) {
        setError('No users found with that email')
      }
    } catch (err: any) {
      setError('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddMember = async (userId: any) => {
    setError('')
    try {
      await addMember({
        groupId,
        userId,
        addedBy: currentUserId,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
    }
  }

  return (
    <motion.div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div 
        className="bg-[#101418] backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border border-[#10B981]/30"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#10B981] text-white flex items-center justify-center shadow-md">
                <UserPlus className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Add Member
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Search by email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-white/50" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#10B981]/30 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-[#10B981] bg-[#111827] text-white placeholder-white/40 transition-all"
                  placeholder="Search by email address..."
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !email}
                className="w-full bg-[#10B981] hover:bg-[#059669] disabled:bg-[#10B981]/30 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 mt-3"
              >
                <Search className="w-5 h-5" />
                {isSearching ? 'Searching...' : 'Search Users'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Check className="w-4 h-4 text-green-600" />
                  Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 bg-[#10B981]/10 rounded-xl border border-[#10B981]/20 hover:border-[#10B981]/40 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center font-semibold shadow-lg">
                          {(user.name || user.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {user.name || user.email || 'Unknown User'}
                          </div>
                          {user.name && user.email && (
                            <div className="text-sm text-white/70">
                              {user.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user._id)}
                        className="bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-[#10B981]/30 text-white rounded-lg hover:bg-[#10B981]/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
