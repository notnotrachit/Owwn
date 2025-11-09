import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '~/lib/auth-context'
import { useMutation, useConvex } from 'convex/react'
import { useState } from 'react'
import { ArrowLeft, Plus, Users, Receipt, DollarSign, TrendingUp, UserPlus, X, Search, Check, LayoutGrid, CreditCard, UserCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

function GroupDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="w-40 h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="w-32 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-8">
            <div className="w-32 h-32 mx-auto bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse mb-4" />
            <div className="w-48 h-8 mx-auto bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
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
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'members'>('overview')

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
        className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to view this group.</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="bg-gray-900 hover:bg-black text-white font-semibold py-2 px-6 rounded-xl transition-colors"
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
        className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Group not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">This group doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="bg-gray-900 hover:bg-black text-white font-semibold py-2 px-6 rounded-xl transition-colors"
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
      className="min-h-screen bg-gray-50 dark:bg-gray-950"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate({ to: '/' })}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <button
                onClick={() => setShowAddExpense(true)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold py-2 px-4 sm:px-6 rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Expense</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-1 mb-6 border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'expenses'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Expenses</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'members'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Members</span>
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Balance Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700">
                <TrendingUp className={`w-5 h-5 ${
                  userBalance.balance > 0
                    ? 'text-green-600 dark:text-green-400'
                    : userBalance.balance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
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
              <p className="text-lg text-gray-600 dark:text-gray-400">
                No expenses yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Add your first expense to get started
              </p>
            </div>
          )}
        </div>

        {/* Suggested Settlements */}
        {balances.settlements.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Suggested Settlements
            </h2>
            <div className="space-y-3">
              {balances.settlements.map((settlement, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900 dark:text-white font-medium">
                      {settlement.fromName}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">→</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {settlement.toName}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                All Expenses
              </h2>
              <button
                onClick={() => setShowAddExpense(true)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-16 text-gray-600 dark:text-gray-400">
                <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No expenses yet</p>
                <p className="text-sm">Add your first expense to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                          {expense.description}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Paid by <span className="font-medium">{expense.paidByName}</span> •{' '}
                          {new Date(expense.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {group.currencySymbol || '$'}{(expense.amount / 100).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Users className="w-3.5 h-3.5" />
                      Split between {expense.splits.length} {expense.splits.length === 1 ? 'person' : 'people'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Members ({group.members.length})
            </h2>
            <button
              onClick={() => setShowAddMember(true)}
              className="text-sm text-gray-900 dark:text-gray-100 hover:underline"
            >
              + Add Member
            </button>
          </div>
          <div className="space-y-2">
            {group.members.map((member: any) => {
              const memberBalance = balances.balances.find(
                (b) => b.userId === member._id
              )
              const displayName = member.name || member.email || 'Unknown User'
              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {displayName}
                      {member.role === 'admin' && (
                        <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    {member.name && member.email && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
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
                </div>
              )
            })}
          </div>
        </div>
        )}
      </main>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddExpense && (
          <AddExpenseModal
            groupId={groupId as any}
            members={group.members}
            currentUserId={user._id}
            currencySymbol={group.currencySymbol || "$"}
            currencyCode={group.currency || "USD"}
            onClose={() => setShowAddExpense(false)}
          />
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
    </motion.div>
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
        className="h-full md:h-auto bg-white dark:bg-gray-900 md:rounded-2xl md:shadow-2xl md:max-w-lg w-full flex flex-col md:max-h-[90vh]"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Add Expense
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                What was it for?
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3.5 text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all"
                placeholder="e.g., Dinner, Groceries, Movie tickets"
                required
                autoFocus
              />
            </div>

            {/* Amount - Most prominent */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-800"></div>

            {/* Paid by */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
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
                        ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paidBy === member._id
                          ? 'border-gray-900 dark:border-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {paidBy === member._id && (
                          <div className="w-3 h-3 rounded-full bg-gray-900 dark:bg-white"></div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {member.name || member.email || 'Unknown User'}
                        {member._id === currentUserId && (
                          <span className="ml-2 text-sm text-gray-500">(You)</span>
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-800"></div>

            {/* Split between */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
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
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Everyone
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('custom')}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                    splitMode === 'custom'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedMembers.includes(member._id)
                            ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedMembers.includes(member._id) && (
                            <Check className="w-3.5 h-3.5 text-white dark:text-gray-900" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {member.name || member.email || 'Unknown User'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Split Preview */}
              {selectedMembers.length > 0 && amount && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Each person pays
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {currencySymbol}{(parseFloat(amount) / selectedMembers.length).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 text-base font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={selectedMembers.length === 0 || !amount || !description}
              className="flex-1 py-4 px-6 text-base font-bold bg-gray-900 hover:bg-black disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
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
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Add Member
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search by email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="Search by email address..."
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !email}
                className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                {isSearching ? 'Searching...' : 'Search Users'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-600" />
                  Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold shadow-lg">
                          {(user.name || user.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {user.name || user.email || 'Unknown User'}
                          </div>
                          {user.name && user.email && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {user.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user._id)}
                        className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
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
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
