import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { salesService } from '../services/salesService'
import { rentalsService } from '../services/rentalsService'
import { orgService } from '../services/orgService'
import { inventoryService } from '../services/inventoryService'

export default function Billing() {
  const { org } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [taxTemplates, setTaxTemplates] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [editingLine, setEditingLine] = useState<any | null>(null)
  const [invoiceLines, setInvoiceLines] = useState<any[]>([])
  const [linesLoading, setLinesLoading] = useState(false)

  const [invoiceForm, setInvoiceForm] = useState({
    customer_id: '',
    status: 'open',
    due_date: '',
  })
  const [lineForm, setLineForm] = useState({
    product_id: '',
    qty: 1,
    unit_price: 0,
  })
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    amount: 0,
    method: 'card',
    paid_at: '',
    notes: '',
  })

  const [taxForm, setTaxForm] = useState({
    id: '',
    country_code: 'US',
    name: '',
    rate: 0,
    tax_included: false,
  })
  const [taxSaving, setTaxSaving] = useState(false)
  const [taxError, setTaxError] = useState<string | null>(null)

  const statusClasses: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-800  ',
    paid: 'bg-green-100 text-green-800  ',
    overdue: 'bg-red-100 text-red-800  ',
    scheduled: 'bg-blue-100 text-blue-800  ',
    active: 'bg-green-100 text-green-800  ',
    paused: 'bg-gray-100 text-gray-800  ',
    draft: 'bg-gray-100 text-gray-800  ',
  }

  useEffect(() => {
    const load = async () => {
      if (!org?.id) return
      setLoading(true)
      const [invoiceData, paymentData, customerData, scheduleData, taxData, productData] = await Promise.all([
        salesService.getInvoices(org.id),
        salesService.getPayments(org.id),
        salesService.getCustomers(org.id),
        rentalsService.getRecurringSchedules(org.id),
        orgService.getTaxTemplates(),
        inventoryService.getProducts(org.id),
      ])
      setInvoices(invoiceData)
      setPayments(paymentData)
      setCustomers(customerData)
      setSchedules(scheduleData)
      setTaxTemplates(taxData)
      setProducts(productData)
      setLoading(false)
    }
    load()
  }, [org?.id, refreshKey])

  const customerName = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers])
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products])

  const formatShortDate = (value?: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
  }

  const todayKey = new Date().toISOString().slice(0, 10)
  const isPastDue = (dueDate?: string | null) => {
    if (!dueDate) return false
    return dueDate < todayKey
  }

  const invoiceColumns = [
    { key: 'invoice', header: 'Invoice' },
    { key: 'customer', header: 'Customer' },
    { key: 'due', header: 'Due' },
    { key: 'status', header: 'Status' },
    { key: 'total', header: 'Total' },
    { key: 'balance', header: 'Balance' },
    { key: 'actions', header: '' },
  ]

  const paymentTotals = useMemo(() => {
    const map = new Map<string, number>()
    payments.forEach((payment) => {
      if (!payment.invoice_id) return
      map.set(payment.invoice_id, (map.get(payment.invoice_id) || 0) + Number(payment.amount || 0))
    })
    return map
  }, [payments])

  const loadInvoiceLines = async (invoiceId: string) => {
    setLinesLoading(true)
    const lines = await salesService.getInvoiceLines(invoiceId)
    setInvoiceLines(lines)
    setLinesLoading(false)
  }

  const invoiceRows = useMemo(() => {
    return invoices.map((invoice) => {
      const total = Number(invoice.total || 0)
      const paid = paymentTotals.get(invoice.id) || 0
      const balance = Math.max(0, total - paid)
      const statusKey = invoice.status || (isPastDue(invoice.due_date) ? 'overdue' : 'open')
      const statusLabel = statusKey === 'paid'
        ? 'Paid'
        : statusKey === 'overdue'
          ? 'Overdue'
          : statusKey === 'draft'
            ? 'Draft'
            : 'Open'

      return {
        invoice: invoice.id.slice(0, 8),
        customer: customerName.get(invoice.customer_id) || '—',
        due: formatShortDate(invoice.due_date),
        status: (
          <span className={`badge ${statusClasses[statusKey] || statusClasses.open}`}>
            {statusLabel}
          </span>
        ),
        total: `$${total.toLocaleString()}`,
        balance: `$${balance.toLocaleString()}`,
        actions: (
          <div className="flex items-center gap-3">
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={async () => {
                setSelectedInvoice(invoice)
                setInvoiceDetailOpen(true)
                await loadInvoiceLines(invoice.id)
              }}
            >
              View
            </button>
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={async () => {
                setEditingInvoice(invoice)
                setEditingLine(null)
                setInvoiceForm({
                  customer_id: invoice.customer_id || '',
                  status: invoice.status || 'open',
                  due_date: invoice.due_date || '',
                })
                setLineForm({ product_id: '', qty: 1, unit_price: 0 })
                setInvoiceModalOpen(true)
                await loadInvoiceLines(invoice.id)
              }}
            >
              Edit
            </button>
            {invoice.status !== 'paid' && (
              <button
                className="text-sm font-medium text-green-600 hover:text-green-700"
                onClick={async () => {
                  const paidTotal = paymentTotals.get(invoice.id) || 0
                  const invoiceTotal = Number(invoice.total || 0)
                  const remaining = Math.max(0, invoiceTotal - paidTotal)
                  if (remaining > 0 && org?.id) {
                    await salesService.createPayment({
                      org_id: org.id,
                      invoice_id: invoice.id,
                      amount: remaining,
                      method: 'manual',
                      paid_at: new Date().toISOString(),
                      notes: 'Auto payment via Mark paid',
                    })
                  }
                  await salesService.updateInvoice({
                    id: invoice.id,
                    customer_id: invoice.customer_id || null,
                    status: 'paid',
                    total: Number(invoice.total || 0),
                    due_date: invoice.due_date || null,
                  })
                  setRefreshKey((prev) => prev + 1)
                }}
              >
                Mark paid
              </button>
            )}
          </div>
        ),
      }
    })
  }, [invoices, customerName, paymentTotals])

  const paymentColumns = [
    { key: 'date', header: 'Date' },
    { key: 'customer', header: 'Customer' },
    { key: 'invoice', header: 'Invoice' },
    { key: 'method', header: 'Method' },
    { key: 'amount', header: 'Amount' },
    { key: 'status', header: 'Status' },
  ]

  const paymentRows = useMemo(() => {
    return payments.map((payment) => ({
      date: formatShortDate(payment.paid_at || payment.created_at),
      customer: payment.invoice_id
        ? customerName.get(invoices.find((invoice) => invoice.id === payment.invoice_id)?.customer_id) || '—'
        : '—',
      invoice: payment.invoice_id ? payment.invoice_id.slice(0, 8) : '—',
      method: payment.method || '—',
      amount: `$${Number(payment.amount || 0).toLocaleString()}`,
      status: (
        <span className={`badge ${statusClasses.paid}`}>
          Posted
        </span>
      ),
    }))
  }, [payments, invoices, customerName])

  const scheduleColumns = [
    { key: 'schedule', header: 'Schedule' },
    { key: 'customer', header: 'Customer' },
    { key: 'frequency', header: 'Frequency' },
    { key: 'nextRun', header: 'Next Run' },
    { key: 'amount', header: 'Amount' },
    { key: 'status', header: 'Status' },
  ]

  const scheduleRows = useMemo(() => {
    const grouped = new Map<string, any>()

    schedules.forEach((line) => {
      const contract = line.rental_contracts
      if (!contract) return

      const entry = grouped.get(line.contract_id) || {
        contractId: line.contract_id,
        customerId: contract.customer_id,
        frequencies: new Set<string>(),
        nextDates: [] as string[],
        amount: 0,
        endDate: contract.end_date,
      }

      entry.frequencies.add(line.frequency || contract.billing_cycle || 'monthly')
      if (line.next_charge_date) {
        entry.nextDates.push(line.next_charge_date)
      }
      entry.amount += Number(line.rate || 0)
      entry.endDate = contract.end_date
      grouped.set(line.contract_id, entry)
    })

    return Array.from(grouped.values()).map((entry) => {
      const frequency = entry.frequencies.size === 1 ? Array.from(entry.frequencies)[0] : 'mixed'
      const nextRun = entry.nextDates.length > 0 ? entry.nextDates.sort()[0] : null
      const isEnded = entry.endDate ? entry.endDate < todayKey : false
      const statusKey = isEnded ? 'paused' : 'active'

      return {
        schedule: entry.contractId.slice(0, 8),
        customer: customerName.get(entry.customerId) || '—',
        frequency: typeof frequency === 'string' ? frequency.charAt(0).toUpperCase() + frequency.slice(1) : 'Mixed',
        nextRun: nextRun ? formatShortDate(nextRun) : '—',
        amount: `$${Number(entry.amount || 0).toLocaleString()}`,
        status: (
          <span className={`badge ${statusClasses[statusKey] || statusClasses.active}`}>
            {statusKey === 'active' ? 'Active' : 'Paused'}
          </span>
        ),
      }
    })
  }, [schedules, customerName, todayKey])

  const taxColumns = [
    { key: 'label', header: 'Tax / Fee' },
    { key: 'type', header: 'Type' },
    { key: 'rate', header: 'Rate' },
    { key: 'jurisdiction', header: 'Jurisdiction' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: '' },
  ]

  const taxRows = useMemo(() => {
    return taxTemplates.map((template) => ({
      label: template.name,
      type: 'Percentage',
      rate: `${Number(template.rate || 0).toFixed(2)}%`,
      jurisdiction: template.country_code,
      status: (
        <span className={`badge ${statusClasses.active}`}>
          Active
        </span>
      ),
      actions: (
        <div className="flex items-center gap-3">
          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={() => {
              setTaxForm({
                id: template.id,
                country_code: template.country_code,
                name: template.name,
                rate: Number(template.rate || 0),
                tax_included: Boolean(template.tax_included),
              })
              setTaxError(null)
            }}
          >
            Edit
          </button>
          <button
            className="text-sm font-medium text-red-500 hover:text-red-600"
            onClick={async () => {
              const success = await orgService.deleteTaxTemplate(template.id)
              if (success) {
                setRefreshKey((prev) => prev + 1)
              }
            }}
          >
            Delete
          </button>
        </div>
      ),
    }))
  }, [taxTemplates])

  const stats = useMemo(() => {
    const outstanding = invoices.reduce((sum, invoice) => {
      const total = Number(invoice.total || 0)
      const paid = paymentTotals.get(invoice.id) || 0
      return sum + Math.max(0, total - paid)
    }, 0)

    const collected30 = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const upcoming = invoices.filter((invoice) => invoice.due_date && invoice.due_date >= todayKey).length
    const activeSchedules = scheduleRows.length

    return {
      outstanding,
      collected30,
      upcoming,
      activeSchedules,
    }
  }, [invoices, payments, paymentTotals, todayKey, scheduleRows.length])

  const invoiceLineTotal = useMemo(() => {
    return invoiceLines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unit_price || 0), 0)
  }, [invoiceLines])

  const displayInvoiceTotal = editingInvoice
    ? (invoiceLines.length > 0 ? invoiceLineTotal : Number(editingInvoice.total || 0))
    : invoiceLineTotal

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Billing"
          subtitle="Review invoices, payments, and recurring charges."
          actions={(
            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center px-4 py-2 rounded-md border border-primary-600 text-primary-700 text-sm font-medium hover:bg-primary-50"
                onClick={() => {
                  setEditingInvoice(null)
                  setEditingLine(null)
                  setInvoiceLines([])
                  setInvoiceForm({ customer_id: '', status: 'open', due_date: '' })
                  setLineForm({ product_id: '', qty: 1, unit_price: 0 })
                  setInvoiceModalOpen(true)
                }}
              >
                New invoice
              </button>
              <button
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                onClick={() => {
                  setPaymentForm({ invoice_id: '', amount: 0, method: 'card', paid_at: '', notes: '' })
                  setPaymentModalOpen(true)
                }}
              >
                Record payment
              </button>
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Outstanding balance', value: `$${stats.outstanding.toLocaleString()}` },
            { label: 'Collected (30d)', value: `$${stats.collected30.toLocaleString()}` },
            { label: 'Upcoming invoices', value: stats.upcoming.toLocaleString() },
            { label: 'Active schedules', value: stats.activeSchedules.toLocaleString() },
          ].map((stat) => (
            <div
              key={stat.label}
              className="app-shell shadow rounded-lg border border-gray-200 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="app-shell shadow rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Invoice List</h2>
                <p className="text-sm text-gray-500">Open, paid, and overdue invoices across customers.</p>
              </div>
              <button
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
                onClick={() => {
                  setEditingInvoice(null)
                  setEditingLine(null)
                  setInvoiceLines([])
                  setInvoiceForm({ customer_id: '', status: 'open', due_date: '' })
                  setLineForm({ product_id: '', qty: 1, unit_price: 0 })
                  setInvoiceModalOpen(true)
                }}
              >
                Create invoice
              </button>
            </div>
            <div className="mt-4">
              <DataTable
                columns={invoiceColumns}
                rows={invoiceRows}
                emptyLabel="No invoices yet."
                enableSearch
                defaultSortKey="invoice"
                loading={loading}
              />
            </div>
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
              <p className="text-sm text-gray-500">All posted payments, deposits, and adjustments.</p>
            </div>
            <div className="mt-4">
              <DataTable
                columns={paymentColumns}
                rows={paymentRows}
                emptyLabel="No payments recorded."
                enableSearch
                defaultSortKey="date"
                loading={loading}
              />
            </div>
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recurring Schedules</h2>
              <p className="text-sm text-gray-500">Contracts and subscriptions queued for automated billing.</p>
            </div>
            <div className="mt-4">
              <DataTable
                columns={scheduleColumns}
                rows={scheduleRows}
                emptyLabel="No recurring schedules yet."
                enableSearch
                defaultSortKey="nextRun"
                loading={loading}
              />
            </div>
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Taxes & Fees</h2>
                <p className="text-sm text-gray-500">Tax rules and service fees applied to invoices.</p>
              </div>
              <Link
                to="/tax-templates"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Full settings
              </Link>
            </div>
            <div className="mt-4">
              <DataTable
                columns={taxColumns}
                rows={taxRows}
                emptyLabel="No tax rules configured."
                enableSearch
                defaultSortKey="label"
                loading={loading}
              />
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Add tax / fee</h3>
                  <p className="text-xs text-gray-500">Create tax rules directly from Billing.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Country</label>
                  <select
                    value={taxForm.country_code}
                    onChange={(e) => setTaxForm({ ...taxForm, country_code: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    {['US', 'CA', 'GB', 'AU', 'DE', 'FR'].map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600">Name</label>
                  <input
                    type="text"
                    value={taxForm.name}
                    onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Sales tax, service fee, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxForm.rate}
                    onChange={(e) => setTaxForm({ ...taxForm, rate: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>
              <label className="mt-3 inline-flex items-center text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={taxForm.tax_included}
                  onChange={(e) => setTaxForm({ ...taxForm, tax_included: e.target.checked })}
                  className="mr-2"
                />
                Prices include tax
              </label>
            {taxError && (
              <div className="mt-3 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{taxError}</p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                className="inline-flex items-center px-3 py-2 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50"
                onClick={async () => {
                  if (!taxForm.name.trim()) {
                    setTaxError('Please enter a tax/fee name.')
                    return
                  }
                  setTaxSaving(true)
                  setTaxError(null)
                  const success = taxForm.id
                    ? await orgService.updateTaxTemplate({
                      id: taxForm.id,
                      country_code: taxForm.country_code,
                      name: taxForm.name.trim(),
                      rate: Number(taxForm.rate),
                      tax_included: taxForm.tax_included,
                    })
                    : await orgService.createTaxTemplate({
                      country_code: taxForm.country_code,
                      name: taxForm.name.trim(),
                      rate: Number(taxForm.rate),
                      tax_included: taxForm.tax_included,
                    })
                  setTaxSaving(false)
                  if (success) {
                    setTaxForm({ id: '', country_code: 'US', name: '', rate: 0, tax_included: false })
                    setRefreshKey((prev) => prev + 1)
                  } else {
                    setTaxError('Failed to save tax template.')
                  }
                }}
                disabled={taxSaving}
              >
                {taxSaving ? 'Saving...' : (taxForm.id ? 'Update tax/fee' : 'Save tax/fee')}
              </button>
              {taxForm.id && (
                <button
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  onClick={() => {
                    setTaxForm({ id: '', country_code: 'US', name: '', rate: 0, tax_included: false })
                    setTaxError(null)
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      <Modal
        open={invoiceModalOpen}
        title={editingInvoice ? 'Edit invoice' : 'Create invoice'}
        onClose={() => setInvoiceModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setInvoiceModalOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                if (editingInvoice) {
                  await salesService.updateInvoice({
                    id: editingInvoice.id,
                    customer_id: invoiceForm.customer_id || null,
                    status: invoiceForm.status,
                    total: invoiceLines.length > 0 ? invoiceLineTotal : Number(editingInvoice.total || 0),
                    due_date: invoiceForm.due_date || null,
                  })
                } else {
                  const invoiceId = await salesService.createInvoiceAndReturnId({
                    org_id: org.id,
                    customer_id: invoiceForm.customer_id || null,
                    status: invoiceForm.status,
                    total: 0,
                    due_date: invoiceForm.due_date || null,
                  })
                  if (invoiceId) {
                    const created = { id: invoiceId, total: 0 }
                    setEditingInvoice(created)
                    await loadInvoiceLines(invoiceId)
                    setRefreshKey((prev) => prev + 1)
                    return
                  }
                }
                setInvoiceModalOpen(false)
                setRefreshKey((prev) => prev + 1)
              }}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              {editingInvoice ? 'Save' : 'Save & add lines'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <select
              value={invoiceForm.customer_id}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={invoiceForm.status}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total</label>
              <div className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                ${Number(displayInvoiceTotal || 0).toLocaleString()}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Due date</label>
            <input
              type="date"
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Line items</h3>
              <p className="text-xs text-gray-500">Products, quantities, and pricing.</p>
            </div>
            {!editingInvoice && (
              <span className="text-xs text-gray-500">Save invoice to add items.</span>
            )}
          </div>

          {editingInvoice && (
            <div className="mt-4 space-y-3">
              {linesLoading ? (
                <p className="text-xs text-gray-500">Loading line items...</p>
              ) : invoiceLines.length === 0 ? (
                <p className="text-xs text-gray-500">No line items yet.</p>
              ) : (
                <div className="space-y-2">
                  {invoiceLines.map((line) => (
                    <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {productName.get(line.product_id) || 'Item'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {line.qty} × ${Number(line.unit_price || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <button
                          className="text-primary-600 hover:text-primary-700"
                          onClick={() => {
                            setEditingLine(line)
                            setLineForm({
                              product_id: line.product_id || '',
                              qty: Number(line.qty || 1),
                              unit_price: Number(line.unit_price || 0),
                            })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-500 hover:text-red-600"
                          onClick={async () => {
                            await salesService.deleteInvoiceLine(line.id)
                            await loadInvoiceLines(editingInvoice.id)
                            await salesService.updateInvoiceTotal(editingInvoice.id)
                            setRefreshKey((prev) => prev + 1)
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Product</label>
                  <select
                    value={lineForm.product_id}
                    onChange={(e) => setLineForm({ ...lineForm, product_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={lineForm.qty}
                    onChange={(e) => setLineForm({ ...lineForm, qty: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Unit price</label>
                  <input
                    type="number"
                    min="0"
                    value={lineForm.unit_price}
                    onChange={(e) => setLineForm({ ...lineForm, unit_price: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center px-3 py-2 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
                  onClick={async () => {
                    if (!editingInvoice) return
                    if (editingLine) {
                      await salesService.updateInvoiceLine({
                        id: editingLine.id,
                        product_id: lineForm.product_id || null,
                        qty: Number(lineForm.qty),
                        unit_price: Number(lineForm.unit_price),
                      })
                    } else {
                      await salesService.createInvoiceLine({
                        invoice_id: editingInvoice.id,
                        product_id: lineForm.product_id || null,
                        qty: Number(lineForm.qty),
                        unit_price: Number(lineForm.unit_price),
                      })
                    }
                    await loadInvoiceLines(editingInvoice.id)
                    await salesService.updateInvoiceTotal(editingInvoice.id)
                    setRefreshKey((prev) => prev + 1)
                    setEditingLine(null)
                    setLineForm({ product_id: '', qty: 1, unit_price: 0 })
                  }}
                >
                  {editingLine ? 'Update line' : 'Add line'}
                </button>
                {editingLine && (
                  <button
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => {
                      setEditingLine(null)
                      setLineForm({ product_id: '', qty: 1, unit_price: 0 })
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={invoiceDetailOpen}
        title="Invoice Details"
        onClose={() => setInvoiceDetailOpen(false)}
        footer={(
          <button
            onClick={() => setInvoiceDetailOpen(false)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            Close
          </button>
        )}
      >
        {selectedInvoice ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Invoice #{selectedInvoice.id.slice(0, 8)}</span>
              <span>Total: ${Number(selectedInvoice.total || 0).toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-600">
              Customer: {customerName.get(selectedInvoice.customer_id) || '—'}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Line Items</h4>
              {linesLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : invoiceLines.length === 0 ? (
                <p className="text-sm text-gray-500">No line items.</p>
              ) : (
                <div className="space-y-2">
                  {invoiceLines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between text-sm">
                      <span>{productName.get(line.product_id) || 'Item'}</span>
                      <span>{line.qty} × ${Number(line.unit_price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Payments</h4>
              {payments.filter((p) => p.invoice_id === selectedInvoice.id).length === 0 ? (
                <p className="text-sm text-gray-500">No payments recorded.</p>
              ) : (
                <div className="space-y-2">
                  {payments.filter((p) => p.invoice_id === selectedInvoice.id).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <span>${Number(payment.amount || 0).toLocaleString()}</span>
                      <span>{formatShortDate(payment.paid_at || payment.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No invoice selected.</p>
        )}
      </Modal>

      <Modal
        open={paymentModalOpen}
        title="Record payment"
        onClose={() => setPaymentModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                await salesService.createPayment({
                  org_id: org.id,
                  invoice_id: paymentForm.invoice_id || null,
                  amount: Number(paymentForm.amount),
                  method: paymentForm.method,
                  paid_at: paymentForm.paid_at || null,
                  notes: paymentForm.notes || null,
                })
                setPaymentModalOpen(false)
                setRefreshKey((prev) => prev + 1)
              }}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              Save
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice</label>
            <select
              value={paymentForm.invoice_id}
              onChange={(e) => setPaymentForm({ ...paymentForm, invoice_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>{invoice.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                min="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Method</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="ach">ACH</option>
                <option value="wire">Wire</option>
                <option value="bank">Bank</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Paid at</label>
            <input
              type="datetime-local"
              value={paymentForm.paid_at}
              onChange={(e) => setPaymentForm({ ...paymentForm, paid_at: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
