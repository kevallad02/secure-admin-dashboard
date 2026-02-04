import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { inventoryService } from '../services/inventoryService'
import { salesService } from '../services/salesService'
import { purchaseService } from '../services/purchaseService'
import { rentalsService } from '../services/rentalsService'

type DurationOption = '7d' | '30d' | '90d' | '365d'

const durationOptions: Array<{ id: DurationOption; label: string; days: number }> = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '365d', label: 'Last 12 months', days: 365 },
]

export default function Reports() {
  const { org } = useAuth()
  const [duration, setDuration] = useState<DurationOption>('30d')
  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [loading, setLoading] = useState(true)
  const [stockLevels, setStockLevels] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [poLines, setPoLines] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])

  const [showInventoryDetails, setShowInventoryDetails] = useState(false)
  const [showSalesDetails, setShowSalesDetails] = useState(false)
  const [showProfitDetails, setShowProfitDetails] = useState(false)
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [showRentalDetails, setShowRentalDetails] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!org?.id) return
      setLoading(true)
      const [levels, productsData, invoicesData, paymentsData, customerData, poLinesData, assetData] = await Promise.all([
        inventoryService.getStockLevels(org.id),
        inventoryService.getProducts(org.id),
        salesService.getInvoices(org.id),
        salesService.getPayments(org.id),
        salesService.getCustomers(org.id),
        purchaseService.getPurchaseOrderLinesForOrg(org.id),
        rentalsService.getAssets(org.id),
      ])
      setStockLevels(levels)
      setProducts(productsData)
      setInvoices(invoicesData)
      setPayments(paymentsData)
      setCustomers(customerData)
      setPoLines(poLinesData)
      setAssets(assetData)
      setLoading(false)
    }
    load()
  }, [org?.id])

  const selectedDuration = durationOptions.find((option) => option.id === duration) || durationOptions[1]
  const endDate = useMemo(() => {
    if (rangeMode === 'custom' && customEnd) {
      return new Date(customEnd)
    }
    return new Date()
  }, [rangeMode, customEnd])
  const startDate = useMemo(() => {
    if (rangeMode === 'custom' && customStart) {
      return new Date(customStart)
    }
    const date = new Date()
    date.setDate(date.getDate() - selectedDuration.days)
    return date
  }, [rangeMode, customStart, selectedDuration.days])

  const isWithinRange = (value?: string | null) => {
    if (!value) return false
    const date = new Date(value)
    return date >= startDate && date <= endDate
  }

  const handleExport = (filename: string, headers: string[], rows: Array<string[]>) => {
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/\"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const averageCostByProduct = useMemo(() => {
    const totals = new Map<string, { qty: number; total: number }>()
    poLines.forEach((line) => {
      if (!line.product_id) return
      const qty = Number(line.qty || 0)
      const cost = Number(line.unit_cost || 0)
      const entry = totals.get(line.product_id) || { qty: 0, total: 0 }
      entry.qty += qty
      entry.total += qty * cost
      totals.set(line.product_id, entry)
    })
    const averages = new Map<string, number>()
    totals.forEach((entry, productId) => {
      averages.set(productId, entry.qty > 0 ? entry.total / entry.qty : 0)
    })
    return averages
  }, [poLines])

  const inventoryValuation = useMemo(() => {
    const productName = new Map(products.map((p) => [p.id, p.name]))
    const rows = stockLevels.map((level) => {
      const unitCost = averageCostByProduct.get(level.product_id) || 0
      const value = Number(level.qty_on_hand || 0) * unitCost
      return {
        product: productName.get(level.product_id) || 'Unknown',
        location: level.location_name,
        qty: Number(level.qty_on_hand || 0),
        unitCost,
        value,
      }
    })
    const totalValue = rows.reduce((sum, row) => sum + row.value, 0)
    return { rows, totalValue }
  }, [stockLevels, products, averageCostByProduct])

  const revenueSeries = useMemo(() => {
    const buckets = 6
    const bucketSize = Math.max(1, selectedDuration.days / buckets)
    const data = Array.from({ length: buckets }, (_, index) => ({
      label: `${Math.round(bucketSize * index)}-${Math.round(bucketSize * (index + 1))}d`,
      value: 0,
    }))

    invoices.forEach((invoice) => {
      if (!isWithinRange(invoice.created_at || invoice.due_date)) return
      const date = new Date(invoice.created_at || invoice.due_date)
      const diffDays = Math.min(selectedDuration.days, Math.max(0, (endDate.getTime() - date.getTime()) / 86400000))
      const bucketIndex = Math.min(buckets - 1, Math.floor((selectedDuration.days - diffDays) / bucketSize))
      data[bucketIndex].value += Number(invoice.total || 0)
    })
    return data
  }, [invoices, selectedDuration.days, endDate, isWithinRange])

  const paymentsSeries = useMemo(() => {
    const buckets = 6
    const bucketSize = Math.max(1, selectedDuration.days / buckets)
    const data = Array.from({ length: buckets }, (_, index) => ({
      label: `${Math.round(bucketSize * index)}-${Math.round(bucketSize * (index + 1))}d`,
      value: 0,
    }))

    payments.forEach((payment) => {
      if (!isWithinRange(payment.paid_at || payment.created_at)) return
      const date = new Date(payment.paid_at || payment.created_at)
      const diffDays = Math.min(selectedDuration.days, Math.max(0, (endDate.getTime() - date.getTime()) / 86400000))
      const bucketIndex = Math.min(buckets - 1, Math.floor((selectedDuration.days - diffDays) / bucketSize))
      data[bucketIndex].value += Number(payment.amount || 0)
    })
    return data
  }, [payments, selectedDuration.days, endDate, isWithinRange])

  const profitLoss = useMemo(() => {
    const revenue = invoices
      .filter((invoice) => isWithinRange(invoice.created_at || invoice.due_date))
      .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0)

    const cogs = poLines
      .filter((line) => isWithinRange(line.created_at))
      .reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unit_cost || 0), 0)

    return {
      revenue,
      cogs,
      grossProfit: revenue - cogs,
    }
  }, [invoices, poLines, isWithinRange])

  const customerBalances = useMemo(() => {
    const paymentTotals = new Map<string, number>()
    payments.forEach((payment) => {
      if (!payment.invoice_id) return
      paymentTotals.set(payment.invoice_id, (paymentTotals.get(payment.invoice_id) || 0) + Number(payment.amount || 0))
    })

    const balances = new Map<string, number>()
    invoices.forEach((invoice) => {
      const total = Number(invoice.total || 0)
      const paid = paymentTotals.get(invoice.id) || 0
      const balance = Math.max(0, total - paid)
      if (!invoice.customer_id) return
      balances.set(invoice.customer_id, (balances.get(invoice.customer_id) || 0) + balance)
    })

    return Array.from(balances.entries())
      .map(([customerId, balance]) => ({
        customer: customers.find((c) => c.id === customerId)?.name || 'Unknown',
        customerId,
        balance,
      }))
      .sort((a, b) => b.balance - a.balance)
  }, [invoices, payments, customers])

  const rentalStats = useMemo(() => {
    const total = assets.length
    const rented = assets.filter((asset) => asset.status === 'rented').length
    const available = assets.filter((asset) => asset.status === 'available').length
    const service = assets.filter((asset) => asset.status === 'service').length
    const retired = assets.filter((asset) => asset.status === 'retired').length
    const active = Math.max(0, total - retired)
    const utilization = active > 0 ? rented / active : 0
    return { total, rented, available, service, retired, utilization }
  }, [assets])

  const maxRevenue = Math.max(...revenueSeries.map((item) => item.value), 0)
  const maxPayments = Math.max(...paymentsSeries.map((item) => item.value), 0)
  const maxCustomerBalance = Math.max(...customerBalances.map((item) => item.balance), 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          subtitle="Track inventory valuation, sales performance, and profitability."
          actions={(
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRangeMode('preset')}
                  className={`px-3 py-2 rounded-md text-xs font-medium border ${
                    rangeMode === 'preset'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Presets
                </button>
                <button
                  onClick={() => setRangeMode('custom')}
                  className={`px-3 py-2 rounded-md text-xs font-medium border ${
                    rangeMode === 'custom'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Custom
                </button>
              </div>
              {rangeMode === 'preset' ? (
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setDuration(option.id)}
                      className={`px-3 py-2 rounded-md text-sm font-medium border ${
                        duration === option.id
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-white"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Inventory value', value: `$${inventoryValuation.totalValue.toLocaleString()}` },
            { label: 'Revenue', value: `$${profitLoss.revenue.toLocaleString()}` },
            { label: 'Gross profit', value: `$${profitLoss.grossProfit.toLocaleString()}` },
            { label: 'Rental utilization', value: `${(rentalStats.utilization * 100).toFixed(1)}%` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {loading ? '...' : stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory Valuation</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estimated value using average purchase costs.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={() => {
                    handleExport(
                      'inventory-valuation.csv',
                      ['Product', 'Location', 'Qty', 'Unit Cost', 'Value'],
                      inventoryValuation.rows.map((row) => [
                        row.product,
                        row.location,
                        row.qty,
                        row.unitCost.toFixed(2),
                        row.value.toFixed(2),
                      ])
                    )
                  }}
                >
                  Export CSV
                </button>
                <button
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => setShowInventoryDetails((prev) => !prev)}
                >
                  {showInventoryDetails ? 'Hide details' : 'View details'}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total: ${inventoryValuation.totalValue.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {inventoryValuation.rows.slice(0, 8).map((row, index) => (
                <div key={`${row.product}-${index}`} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-900 dark:text-white">{row.product}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white">${row.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.qty} units</p>
                  </div>
                </div>
              ))}
              {inventoryValuation.rows.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No stock valuation data yet.</p>
              )}
            </div>
            {showInventoryDetails && inventoryValuation.rows.length > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                {inventoryValuation.rows.map((row, index) => (
                  <div key={`${row.product}-${index}`} className="flex items-center justify-between text-sm">
                    <span>{row.product}</span>
                    <span>{row.location}</span>
                    <span>{row.qty} units</span>
                    <span>${row.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sales & Revenue</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Invoices and payments across the selected range.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={() => {
                    handleExport(
                      'sales-revenue.csv',
                      ['Type', 'Date', 'Amount'],
                      [
                        ...invoices
                          .filter((invoice) => isWithinRange(invoice.created_at || invoice.due_date))
                          .map((invoice) => ['Invoice', formatShortDate(invoice.created_at || invoice.due_date), invoice.total]),
                        ...payments
                          .filter((payment) => isWithinRange(payment.paid_at || payment.created_at))
                          .map((payment) => ['Payment', formatShortDate(payment.paid_at || payment.created_at), payment.amount]),
                      ]
                    )
                  }}
                >
                  Export CSV
                </button>
                <button
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => setShowSalesDetails((prev) => !prev)}
                >
                  {showSalesDetails ? 'Hide details' : 'View details'}
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invoice totals</p>
                <div className="mt-2 grid grid-cols-6 gap-2 items-end h-32">
                  {revenueSeries.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-md bg-primary-500/70"
                        style={{ height: `${maxRevenue ? (item.value / maxRevenue) * 100 : 0}%` }}
                      />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment totals</p>
                <div className="mt-2 grid grid-cols-6 gap-2 items-end h-32">
                  {paymentsSeries.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-md bg-emerald-500/70"
                        style={{ height: `${maxPayments ? (item.value / maxPayments) * 100 : 0}%` }}
                      />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {showSalesDetails && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invoices</p>
                  {invoices.filter((invoice) => isWithinRange(invoice.created_at || invoice.due_date)).length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No invoices in range.</p>
                  ) : (
                    invoices
                      .filter((invoice) => isWithinRange(invoice.created_at || invoice.due_date))
                      .map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between">
                          <span>{invoice.id.slice(0, 8)}</span>
                          <span>{formatShortDate(invoice.created_at || invoice.due_date)}</span>
                          <span>${Number(invoice.total || 0).toLocaleString()}</span>
                        </div>
                      ))
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payments</p>
                  {payments.filter((payment) => isWithinRange(payment.paid_at || payment.created_at)).length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No payments in range.</p>
                  ) : (
                    payments
                      .filter((payment) => isWithinRange(payment.paid_at || payment.created_at))
                      .map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between">
                          <span>{payment.invoice_id ? payment.invoice_id.slice(0, 8) : '—'}</span>
                          <span>{formatShortDate(payment.paid_at || payment.created_at)}</span>
                          <span>${Number(payment.amount || 0).toLocaleString()}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profit / Loss</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue minus purchase costs.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={() => {
                    handleExport(
                      'profit-loss.csv',
                      ['Type', 'Amount'],
                      [
                        ['Revenue', profitLoss.revenue.toFixed(2)],
                        ['COGS', profitLoss.cogs.toFixed(2)],
                        ['Gross Profit', profitLoss.grossProfit.toFixed(2)],
                      ]
                    )
                  }}
                >
                  Export CSV
                </button>
                <button
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => setShowProfitDetails((prev) => !prev)}
                >
                  {showProfitDetails ? 'Hide details' : 'View details'}
                </button>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: 'Revenue', value: profitLoss.revenue, color: 'bg-primary-500/70' },
                { label: 'COGS', value: profitLoss.cogs, color: 'bg-orange-400/70' },
                { label: 'Gross Profit', value: profitLoss.grossProfit, color: 'bg-emerald-500/70' },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                    ${item.value.toLocaleString()}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{
                        width: `${profitLoss.revenue > 0 ? Math.min(100, (item.value / profitLoss.revenue) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {showProfitDetails && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-sm">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">COGS lines</p>
                {poLines.filter((line) => isWithinRange(line.created_at)).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No COGS entries in range.</p>
                ) : (
                  poLines
                    .filter((line) => isWithinRange(line.created_at))
                    .map((line) => (
                      <div key={line.id} className="flex items-center justify-between">
                        <span>{line.product_id ? line.product_id.slice(0, 8) : '—'}</span>
                        <span>{Number(line.qty || 0)} × ${Number(line.unit_cost || 0).toLocaleString()}</span>
                        <span>${(Number(line.qty || 0) * Number(line.unit_cost || 0)).toLocaleString()}</span>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Balances</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding balances by customer.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={() => {
                    handleExport(
                      'customer-balances.csv',
                      ['Customer', 'Balance'],
                      customerBalances.map((row) => [row.customer, row.balance.toFixed(2)])
                    )
                  }}
                >
                  Export CSV
                </button>
                <button
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => setShowCustomerDetails((prev) => !prev)}
                >
                  {showCustomerDetails ? 'Hide details' : 'View details'}
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {customerBalances.slice(0, 8).map((row) => (
                <div key={row.customer} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 dark:text-white">{row.customer}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-40 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-red-500/70"
                        style={{ width: `${maxCustomerBalance ? (row.balance / maxCustomerBalance) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">${row.balance.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {customerBalances.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No outstanding balances.</p>
              )}
            </div>
            {showCustomerDetails && customerBalances.length > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-sm">
                {customerBalances.map((row) => (
                  <div key={row.customer} className="flex items-center justify-between">
                    <span>{row.customer}</span>
                    <span>${row.balance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rental Utilization</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Asset status distribution and utilization rate.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  onClick={() => {
                    handleExport(
                      'rental-utilization.csv',
                      ['Asset', 'Status'],
                      assets.map((asset) => [asset.serial || asset.id, asset.status])
                    )
                  }}
                >
                  Export CSV
                </button>
                <button
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => setShowRentalDetails((prev) => !prev)}
                >
                  {showRentalDetails ? 'Hide details' : 'View details'}
                </button>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                {[
                  { label: 'Rented', value: rentalStats.rented, color: 'bg-primary-500/70' },
                  { label: 'Available', value: rentalStats.available, color: 'bg-emerald-500/70' },
                  { label: 'Service', value: rentalStats.service, color: 'bg-amber-500/70' },
                  { label: 'Retired', value: rentalStats.retired, color: 'bg-gray-500/70' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 dark:text-white">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${rentalStats.total > 0 ? (item.value / rentalStats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-gray-700 dark:text-gray-200">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Utilization</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                  {(rentalStats.utilization * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {rentalStats.rented} of {Math.max(0, rentalStats.total - rentalStats.retired)} active assets rented.
                </p>
                <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${rentalStats.utilization * 100}%` }}
                  />
                </div>
              </div>
            </div>
            {showRentalDetails && assets.length > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-sm">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <span>{asset.serial || asset.id.slice(0, 8)}</span>
                    <span className="capitalize">{asset.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
