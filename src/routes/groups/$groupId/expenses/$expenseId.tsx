import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../../convex/_generated/api'
import { motion, AnimatePresence } from 'motion/react'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAuth } from '~/lib/auth-context'

export const Route = createFileRoute('/groups/$groupId/expenses/$expenseId')({
  component: ExpenseDetails,
})

function ExpenseDetails() {
  const { groupId, expenseId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteExpense = useMutation(api.expenses.deleteExpense)

  const { data: expense } = useSuspenseQuery(
    convexQuery(api.expenses.getExpenseDetails, { 
      expenseId: expenseId as Id<'expenses'> 
    })
  )

  const { data: group } = useSuspenseQuery(
    convexQuery(api.groups.getGroupDetails, { 
      groupId: groupId as Id<'groups'> 
    })
  )

  if (!expense || !group) {
    return (
      <div className="min-h-[100dvh] bg-[#0A0F12] flex items-center justify-center">
        <div className="text-white">Expense not found</div>
      </div>
    )
  }

  const currencySymbol = group.currencySymbol || '$'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#0A0F12]"
    >
      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Amount */}
        <div className="text-center mb-6 p-6 bg-[#10B981]/10 rounded-xl border border-[#10B981]/30">
          <div className="text-4xl font-bold text-[#10B981] mb-2">
            {currencySymbol}{(expense.amount / 100).toFixed(2)}
          </div>
          <div className="text-lg text-white font-medium">{expense.description}</div>
          {expense.category && (
            <div className="inline-block mt-2 px-3 py-1 bg-[#10B981]/20 rounded-full text-xs text-[#10B981] font-medium">
              {expense.category}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="mb-6 p-4 bg-[#111827] rounded-lg border border-[#10B981]/20">
          <div className="text-sm text-white/60 mb-1">Date</div>
          <div className="text-white font-medium">
            {new Date(expense.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Paid By */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white/80 mb-3">Paid By</h3>
          <div className="space-y-2">
            {expense.payments && expense.payments.length > 1 ? (
              expense.payments.map((payment: any) => (
                <div
                  key={payment.userId}
                  className="flex items-center justify-between p-3 bg-[#111827] rounded-lg border border-[#10B981]/20"
                >
                  <div className="text-white font-medium">{payment.userName}</div>
                  <div className="text-[#10B981] font-semibold">
                    {currencySymbol}{(payment.amount / 100).toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between p-3 bg-[#111827] rounded-lg border border-[#10B981]/20">
                <div className="text-white font-medium">{expense.paidByName}</div>
                <div className="text-[#10B981] font-semibold">
                  {currencySymbol}{(expense.amount / 100).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Split Details */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white/80 mb-3">Split Between</h3>
          <div className="space-y-2">
            {expense.splits.map((split: any) => (
              <div
                key={split.userId}
                className="flex items-center justify-between p-3 bg-[#111827] rounded-lg border border-[#10B981]/20"
              >
                <div className="flex items-center gap-3">
                  <div className="text-white font-medium">{split.userName}</div>
                  {split.isPaid && (
                    <span className="px-2 py-0.5 bg-[#10B981]/20 text-[#10B981] text-xs rounded-full font-medium">
                      Paid
                    </span>
                  )}
                </div>
                <div className="text-white/80 font-semibold">
                  {currencySymbol}{(split.amount / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Notes</h3>
            <div className="p-4 bg-[#111827] rounded-lg border border-[#10B981]/20 text-white/80 text-sm">
              {expense.notes}
            </div>
          </div>
        )}

        {/* Delete Button */}
        {user && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Expense
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm bg-[#101418] rounded-2xl border border-[#10B981]/30 p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Delete Expense?</h3>
              <p className="text-sm text-white/70 mb-6">
                Are you sure you want to delete "{expense.description}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 border border-[#10B981]/30 text-white rounded-xl hover:bg-[#10B981]/10 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!user) return
                    setIsDeleting(true)
                    try {
                      await deleteExpense({
                        expenseId: expenseId as Id<'expenses'>,
                        userId: user._id,
                      })
                      navigate({ to: '/groups/$groupId', params: { groupId } })
                    } catch (error) {
                      console.error('Failed to delete expense:', error)
                      setIsDeleting(false)
                      setShowDeleteConfirm(false)
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    'Deleting...'
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
