import { useEffect, useMemo, useState, type ReactNode } from 'react'

export interface DataTableColumn {
  key: string
  header: string
  className?: string
}

export interface DataTableProps {
  columns: DataTableColumn[]
  rows: Array<Record<string, ReactNode>>
  loading?: boolean
  emptyLabel?: string
  rowKey?: (row: Record<string, ReactNode>, index: number) => string
  enableSort?: boolean
  defaultSortKey?: string
  pageSize?: number
  enableSearch?: boolean
  searchPlaceholder?: string
}

export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyLabel = 'No records found.',
  rowKey,
  enableSort = true,
  defaultSortKey,
  pageSize = 10,
  enableSearch = false,
  searchPlaceholder = 'Search...',
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => {
    if (!enableSearch || !search.trim()) return rows
    const term = search.trim().toLowerCase()
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(term))
    )
  }, [rows, enableSearch, search])

  const sortedRows = useMemo(() => {
    if (!enableSort || !sortKey) return rows
    const copy = [...filteredRows]
    copy.sort((a, b) => {
      const av = String(a[sortKey] ?? '').toLowerCase()
      const bv = String(b[sortKey] ?? '').toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [filteredRows, enableSort, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, currentPage, pageSize])

  const handleSort = (key: string) => {
    if (!enableSort) return
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [rows, search])

  return (
    <div className="app-shell shadow rounded-lg border border-gray-200  overflow-hidden">
      {enableSearch && (
        <div className="px-4 py-3 border-b border-gray-200 ">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full sm:w-64 rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200  text-sm">
          <thead className="bg-gray-50 ">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-left font-semibold text-gray-700  ${column.className || ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className={`inline-flex items-center gap-1 ${enableSort ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {column.header}
                    {enableSort && sortKey === column.key && (
                      <span className="text-xs text-gray-500 ">
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 ">
            {loading ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500 "
                  colSpan={columns.length}
                >
                  Loading...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500 "
                  colSpan={columns.length}
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              pagedRows.map((row, index) => (
                <tr key={rowKey ? rowKey(row, index) : `${index}`}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-gray-800  ${column.className || ''}`}
                    >
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 ">
        <div>
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 rounded border border-gray-200  disabled:opacity-50"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <button
            className="px-2 py-1 rounded border border-gray-200  disabled:opacity-50"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
