import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { activityLogService, type ActivityLog } from '../services/activityLogService'
import { useAuth } from '../context/AuthContext'

export default function Logs() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const pageSize = 10
  const hasLoadedRef = useRef(false)
  const { org, isAdmin, isOwner, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadLogs(isAdmin || isOwner)
  }, [authLoading, isAdmin, isOwner])

  const loadLogs = async (adminStatus: boolean) => {
    try {
      setLoading(true)
      if (adminStatus && org?.id) {
        const { data, count } = await activityLogService.getLogsPaged(org.id, page, pageSize)
        setLogs(data)
        setTotalCount(count)
      }
    } catch (error) {
      console.error('Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = term
      ? log.action.toLowerCase().includes(term) ||
        log.user_id.toLowerCase().includes(term) ||
        log.ip_address.toLowerCase().includes(term)
      : true
    const status = log.action.toLowerCase()
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'error'
        ? status.includes('error') || status.includes('failed')
        : statusFilter === 'success'
          ? status.includes('success') || status.includes('completed')
          : statusFilter === 'info'
            ? true
            : true
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedLogs = filteredLogs

  const exportCsv = () => {
    const headers = ['Action', 'User', 'IP Address', 'Timestamp']
    const rows = filteredLogs.map((log) => [
      log.action,
      log.profiles?.email || log.user_id,
      log.ip_address,
      new Date(log.created_at).toISOString(),
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setToast('CSV exported successfully.')
  }

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin && !isOwner) return
    loadLogs(true)
  }, [page, authLoading, isAdmin, isOwner, org?.id])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Loading logs...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAdmin && !isOwner) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Restricted
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Admin access required to view activity logs.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Current access level: User. Contact an administrator to upgrade your role.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {toast && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-800 dark:text-green-200">
            {toast}
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and monitor all system activities
            </p>
          </div>
          <button
            onClick={exportCsv}
            className="mt-4 sm:mt-0 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            Export Logs
          </button>
        </div>

        {/* Filters */}
        <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="info">Info</option>
            </select>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <FunnelIcon className="h-5 w-5 mr-2" />
              {filteredLogs.length} results
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="app-shell divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No activity logs found
                    </td>
                  </tr>
                ) : pagedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.action}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {log.profiles?.email || `${log.user_id.substring(0, 8)}...`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {log.ip_address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        Info
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        User: {log.profiles?.email || log.user_id.substring(0, 8)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-50"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <button
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-50"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
