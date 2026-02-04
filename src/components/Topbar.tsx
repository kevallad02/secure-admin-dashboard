import { BellIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'

export default function Topbar() {
  const { user, signOut, profile } = useAuth()

  return (
    <div className="app-shell border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* Search or Title */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors relative"
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-500">
                {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Loading...'}
              </p>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
