import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { orgMembersService, type OrgMember } from '../services/orgMembersService'
import { useAuth } from '../context/AuthContext'

export default function Users() {
  const [users, setUsers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10
  const hasLoadedRef = useRef(false)
  const { org, isAdmin, isOwner, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadUsers(isAdmin || isOwner)
  }, [authLoading, isAdmin, isOwner])

  const loadUsers = async (adminStatus: boolean) => {
    try {
      setLoading(true)
      if (adminStatus && org?.id) {
        const { data, count } = await orgMembersService.getOrgMembersPaged(org.id, page, pageSize)
        setUsers(data)
        setTotalCount(count)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = term
      ? (user.profiles?.[0]?.email || '').toLowerCase().includes(term) || user.user_id.toLowerCase().includes(term)
      : true
    const matchesRole = roleFilter === 'all' ? true : user.role === roleFilter
    return matchesSearch && matchesRole
  })

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter])

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin && !isOwner) return
    loadUsers(true)
  }, [page, authLoading, isAdmin, isOwner, org?.id])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = filteredUsers

  if (!isAdmin && !isOwner && !loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Restricted
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Admin access required to view users.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage and view all users in the system
            </p>
          </div>
          <button className="mt-4 sm:mt-0 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="member">Member</option>
            </select>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <FunnelIcon className="h-5 w-5 mr-2" />
              {filteredUsers.length} results
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="app-shell divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : pagedUsers.map((user) => (
                  <tr key={`${user.org_id}-${user.user_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                              {user.profiles?.[0]?.email?.substring(0, 2).toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.profiles?.[0]?.email || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {user.user_id.substring(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      >
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        Delete
                      </button>
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
