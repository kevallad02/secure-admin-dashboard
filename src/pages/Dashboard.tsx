import { useState, useEffect, useRef } from 'react'
import { UserGroupIcon, UserIcon, UserPlusIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import DashboardLayout from '../components/DashboardLayout'
import { edgeFunctionService } from '../services/edgeFunctionService'
import { activityLogService } from '../services/activityLogService'
import { orgMembersService } from '../services/orgMembersService'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    recentActivity: 0,
  })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  const { org, isAdmin, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadDashboardData(isAdmin)
  }, [authLoading, isAdmin])

  const loadDashboardData = async (adminStatus: boolean) => {
    try {
      setLoading(true)

      // Load stats from edge function
      const dashboardStats = await edgeFunctionService.getDashboardStats()
      if (dashboardStats) {
        setStats(dashboardStats)
      }

      // Load data based on admin status
      if (adminStatus && org?.id) {
        const { data: members } = await orgMembersService.getOrgMembersPaged(org.id, 1, 4)
        setRecentUsers(members)

        const logs = await activityLogService.getAllLogs(org.id)
        setRecentLogs(logs.slice(0, 4))
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsData = [
    {
      name: 'Total Users',
      value: loading ? '...' : stats.totalUsers.toLocaleString(),
      change: '+12.5%',
      changeType: 'increase',
      icon: UserGroupIcon,
    },
    {
      name: 'Active Users',
      value: loading ? '...' : stats.activeUsers.toLocaleString(),
      change: '+8.2%',
      changeType: 'increase',
      icon: UserIcon,
    },
    {
      name: 'New Users',
      value: loading ? '...' : stats.newUsers.toLocaleString(),
      change: '+23.1%',
      changeType: 'increase',
      icon: UserPlusIcon,
    },
    {
      name: 'Recent Activity',
      value: loading ? '...' : stats.recentActivity.toLocaleString(),
      change: '+15.3%',
      changeType: 'increase',
      icon: ChartBarIcon,
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statsData.map((stat) => (
            <div
              key={stat.name}
              className="app-shell overflow-hidden shadow rounded-lg border border-gray-200"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-primary-50 rounded-lg">
                      <stat.icon className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stat.value}
                        </div>
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                          {stat.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Users */}
          <div className="app-shell shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Users
              </h3>
              <div className="mt-5 space-y-4">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : recentUsers.length > 0 ? (
                  recentUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {user.profiles?.email?.substring(0, 2).toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.profiles?.email || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                        >
                          Active
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No users found</p>
                )}
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="app-shell shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Activity Log
              </h3>
              <div className="mt-5 space-y-4">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : recentLogs.length > 0 ? (
                  recentLogs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {log.action}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.ip_address}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No activity logs</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
