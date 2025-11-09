import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '~/lib/auth-context'
import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { Users, ArrowRight, Receipt, TrendingUp, Sparkles, LogOut } from 'lucide-react'
import { motion } from 'motion/react'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { user, signIn, signUp, signOut } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      if (isSignUp) {
        if (!name) {
          setError('Name is required')
          return
        }
        await signUp(email, password, name)
      } else {
        await signIn(email, password)
      }
      setShowAuth(false)
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gray-900 text-white mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">Owwn</h1>
            <p className="text-gray-600 dark:text-gray-300">Own what you owe</p>
          </div>

          {!showAuth ? (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300 text-center mb-6">
                Split expenses with friends, roommates, and groups. Track who
                owes what and settle up easily.
              </p>
              <button
                onClick={() => {
                  setShowAuth(true)
                  setIsSignUp(false)
                }}
                className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setShowAuth(true)
                  setIsSignUp(true)
                }}
                className="w-full border-2 border-gray-900 dark:border-gray-300 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Sign Up
              </button>
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Receipt className="w-6 h-6 text-gray-900 dark:text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Track Expenses</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Users className="w-6 h-6 text-gray-900 dark:text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Split Bills</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <TrendingUp className="w-6 h-6 text-gray-900 dark:text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Settle Up</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h3>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:bg-gray-700 dark:text-white"
                  placeholder="your@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
              
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-gray-900 dark:text-gray-100 hover:underline py-2 text-sm"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
              
              <button
                type="button"
                onClick={() => setShowAuth(false)}
                className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-2"
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return <Dashboard user={user} onLogout={signOut} />
}

function Dashboard({
  user,
  onLogout,
}: {
  user: { _id: any; name: string; email: string }
  onLogout: () => void
}) {
  const { data: groups } = useSuspenseQuery(
    convexQuery(api.groups.getUserGroups, { userId: user._id })
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Owwn</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Own what you owe
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name || user.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Your Groups
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your shared expenses and settlements
            </p>
          </div>
          <Link
            to="/groups/new"
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <Users className="w-5 h-5" />
            Create Group
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-12 text-center border border-gray-200 dark:border-gray-800">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
              <Users className="w-10 h-10 text-gray-700 dark:text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No groups yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create your first group to start tracking expenses with friends, roommates, or travel companions
            </p>
            <Link
              to="/groups/new"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold py-3 px-8 rounded-xl transition-colors"
            >
              <Users className="w-5 h-5" />
              Create Your First Group
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group: any) => (
              <Link
                key={group._id}
                to="/groups/$groupId"
                params={{ groupId: group._id }}
                className="group bg-white dark:bg-gray-900 rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {group.name}
                        </h3>
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                  {group.role === 'admin' && (
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                      Admin
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{group.memberCount} members</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
