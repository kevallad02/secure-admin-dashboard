import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import { salesService } from '../services/salesService'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { inventoryService } from '../services/inventoryService'

const tabs = [
  { id: 'customers', label: 'Customers' },
  { id: 'orders', label: 'Sales Orders' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payments' },
]

const statusClasses: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

export default function Sales() {
  const { org } = useAuth()
  const [activeTab, setActiveTab] = useState<'customers' | 'orders' | 'invoices' | 'payments'>('customers')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Array<Record<string, React.ReactNode>>>([])
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [customers, setCustomers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [editingCustomer, setEditingCustomer] = useState<any | null>(null)
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null)
  const [editingPayment, setEditingPayment] = useState<any | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [invoiceLines, setInvoiceLines] = useState<any[]>([])
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<any | null>(null)
  const [refundTarget, setRefundTarget] = useState<any | null>(null)
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundReason, setRefundReason] = useState('')

  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' })
  const [orderForm, setOrderForm] = useState({ customer_id: '', status: 'draft', total: 0 })
  const [invoiceForm, setInvoiceForm] = useState({ customer_id: '', status: 'open', due_date: '' })
  const [paymentForm, setPaymentForm] = useState({ invoice_id: '', amount: 0, method: 'cash', paid_at: '', notes: '' })
  const [lineForm, setLineForm] = useState({ product_id: '', qty: 1, unit_price: 0 })
  const [productQuery, setProductQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!org?.id) return
      setLoading(true)
      const [customerData, orderData, invoiceData, paymentData] = await Promise.all([
        salesService.getCustomers(org.id),
        salesService.getSalesOrders(org.id),
        salesService.getInvoices(org.id),
        salesService.getPayments(org.id),
      ])
      setCustomers(customerData)
      setOrders(orderData)
      setInvoices(invoiceData)
      setPayments(paymentData)
      const productData = await inventoryService.getProducts(org.id)
      setProducts(productData)
      setLoading(false)
    }
    load()
  }, [org?.id, refreshKey])

  const columns = useMemo(() => {
    if (activeTab === 'orders') {
      return [
        { key: 'order', header: 'Order' },
        { key: 'customer', header: 'Customer' },
        { key: 'status', header: 'Status' },
        { key: 'total', header: 'Total' },
        { key: 'date', header: 'Date' },
        { key: 'actions', header: '' },
      ]
    }
    if (activeTab === 'invoices') {
      return [
        { key: 'invoice', header: 'Invoice' },
        { key: 'customer', header: 'Customer' },
        { key: 'status', header: 'Status' },
        { key: 'total', header: 'Total' },
        { key: 'balance', header: 'Balance' },
        { key: 'due', header: 'Due' },
        { key: 'actions', header: '' },
      ]
    }
    if (activeTab === 'payments') {
      return [
        { key: 'payment', header: 'Payment' },
        { key: 'invoice', header: 'Invoice' },
        { key: 'amount', header: 'Amount' },
        { key: 'method', header: 'Method' },
        { key: 'date', header: 'Date' },
        { key: 'actions', header: '' },
      ]
    }
    return [
      { key: 'customer', header: 'Customer' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'created', header: 'Created' },
      { key: 'actions', header: '' },
    ]
  }, [activeTab])

  useEffect(() => {
    setSearch('')
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'customers') {
      setRows(customers.map((customer) => ({
        customer: customer.name,
        email: customer.contact?.email || '—',
        phone: customer.contact?.phone || '—',
        created: new Date(customer.created_at).toLocaleDateString(),
        actions: (
          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={() => {
              setEditingCustomer(customer)
              setCustomerForm({
                name: customer.name || '',
                email: customer.contact?.email || '',
                phone: customer.contact?.phone || '',
              })
              setCustomerModalOpen(true)
            }}
          >
            Edit
          </button>
        ),
      })))
    } else if (activeTab === 'orders') {
      const mapCustomerName = new Map(customers.map((c) => [c.id, c.name]))
      setRows(orders.map((order) => ({
        order: order.id.slice(0, 8),
        customer: mapCustomerName.get(order.customer_id) || '—',
        status: (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[order.status] || statusClasses.draft}`}>
            {order.status}
          </span>
        ),
        total: `$${Number(order.total || 0).toLocaleString()}`,
        date: new Date(order.created_at).toLocaleDateString(),
        actions: (
          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={() => {
              setEditingOrder(order)
              setOrderForm({
                customer_id: order.customer_id || '',
                status: order.status || 'draft',
                total: Number(order.total || 0),
              })
              setOrderModalOpen(true)
            }}
          >
            Edit
          </button>
        ),
      })))
    } else if (activeTab === 'invoices') {
      const mapCustomerName = new Map(customers.map((c) => [c.id, c.name]))
      const paymentTotals = payments.reduce<Record<string, number>>((acc, payment) => {
        if (!payment.invoice_id) return acc
        acc[payment.invoice_id] = (acc[payment.invoice_id] || 0) + Number(payment.amount || 0)
        return acc
      }, {})

      setRows(invoices.map((invoice) => {
        const paid = paymentTotals[invoice.id] || 0
        const total = Number(invoice.total || 0)
        const now = new Date()
        const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
        const overdue = dueDate ? dueDate < now && paid < total : false
        const status = paid >= total && total > 0 ? 'paid' : overdue ? 'overdue' : invoice.status || 'open'
        const balance = Math.max(total - paid, 0)
        return {
          invoice: invoice.id.slice(0, 8),
          customer: mapCustomerName.get(invoice.customer_id) || '—',
          status: (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status] || statusClasses.open}`}>
              {status}
            </span>
          ),
          total: `$${total.toLocaleString()}`,
          balance: `$${balance.toLocaleString()}`,
          due: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—',
          actions: (
            <div className="flex items-center gap-2">
              <button
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
                onClick={async () => {
                  setSelectedInvoice(invoice)
                  const lines = await salesService.getInvoiceLines(invoice.id)
                  setInvoiceLines(lines)
                  setDetailModalOpen(true)
                }}
              >
                View
              </button>
              <button
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
                onClick={() => {
                  setEditingInvoice(invoice)
                  setInvoiceForm({
                    customer_id: invoice.customer_id || '',
                    status: invoice.status || 'open',
                    due_date: invoice.due_date || '',
                  })
                  setInvoiceModalOpen(true)
                }}
              >
                Edit
              </button>
            </div>
          ),
        }
      }))
    } else if (activeTab === 'payments') {
      setRows(payments.map((payment) => ({
        payment: payment.id.slice(0, 8),
        invoice: payment.invoice_id ? payment.invoice_id.slice(0, 8) : '—',
        amount: `$${Number(payment.amount || 0).toLocaleString()}`,
        method: payment.method || '—',
        date: new Date(payment.paid_at || payment.created_at).toLocaleDateString(),
        actions: (
          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={() => {
              setEditingPayment(payment)
              setPaymentForm({
                invoice_id: payment.invoice_id || '',
                amount: Number(payment.amount || 0),
                method: payment.method || 'cash',
                paid_at: payment.paid_at || '',
                notes: payment.notes || '',
              })
              setPaymentModalOpen(true)
            }}
          >
            Edit
          </button>
        ),
      })))
    }
  }, [activeTab, customers, orders, invoices, payments])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const term = search.trim().toLowerCase()
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(term))
    )
  }, [rows, search])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Sales + Billing"
          subtitle="Manage customers, orders, invoices, and payments."
          actions={(
            <button
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              onClick={() => {
                if (activeTab === 'customers') {
                  setEditingCustomer(null)
                  setCustomerForm({ name: '', email: '', phone: '' })
                  setCustomerModalOpen(true)
                } else if (activeTab === 'orders') {
                  setEditingOrder(null)
                  setOrderForm({ customer_id: '', status: 'draft', total: 0 })
                  setOrderModalOpen(true)
                } else if (activeTab === 'invoices') {
                  setEditingInvoice(null)
                  setInvoiceForm({ customer_id: '', status: 'open', due_date: '' })
                  setInvoiceModalOpen(true)
                } else if (activeTab === 'payments') {
                  setEditingPayment(null)
                  setPaymentForm({ invoice_id: '', amount: 0, method: 'cash', paid_at: '', notes: '' })
                  setPaymentModalOpen(true)
                }
              }}
            >
              {activeTab === 'customers' && 'Add customer'}
              {activeTab === 'orders' && 'Create order'}
              {activeTab === 'invoices' && 'Create invoice'}
              {activeTab === 'payments' && 'Record payment'}
            </button>
          )}
        />

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full sm:w-64 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>

        <DataTable
          columns={columns}
          rows={filteredRows}
          loading={loading}
          emptyLabel="No records yet."
          defaultSortKey={activeTab === 'customers' ? 'customer' : undefined}
        />
      </div>

      <Modal
        open={customerModalOpen}
        title={editingCustomer ? 'Edit customer' : 'Add customer'}
        onClose={() => setCustomerModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setCustomerModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id || !customerForm.name.trim()) return
                if (editingCustomer) {
                  await salesService.updateCustomer({
                    id: editingCustomer.id,
                    name: customerForm.name.trim(),
                    contact: { email: customerForm.email, phone: customerForm.phone },
                  })
                } else {
                  await salesService.createCustomer({
                    org_id: org.id,
                    name: customerForm.name.trim(),
                    contact: { email: customerForm.email, phone: customerForm.phone },
                  })
                }
                setCustomerModalOpen(false)
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input
              type="text"
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
            <input
              type="text"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={orderModalOpen}
        title={editingOrder ? 'Edit order' : 'Create order'}
        onClose={() => setOrderModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setOrderModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                if (editingOrder) {
                  await salesService.updateOrder({
                    id: editingOrder.id,
                    customer_id: orderForm.customer_id || null,
                    status: orderForm.status,
                    total: Number(orderForm.total),
                  })
                } else {
                  await salesService.createOrder({
                    org_id: org.id,
                    customer_id: orderForm.customer_id || null,
                    status: orderForm.status,
                    total: Number(orderForm.total),
                  })
                }
                setOrderModalOpen(false)
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
            <select
              value={orderForm.customer_id}
              onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={orderForm.status}
                onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
              <input
                type="number"
                min="0"
                value={orderForm.total}
                onChange={(e) => setOrderForm({ ...orderForm, total: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={invoiceModalOpen}
        title={editingInvoice ? 'Edit invoice' : 'Create invoice'}
        onClose={() => setInvoiceModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setInvoiceModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
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
                    total: editingInvoice.total || 0,
                    due_date: invoiceForm.due_date || null,
                  })
                  await salesService.updateInvoiceTotal(editingInvoice.id)
                } else {
                  await salesService.createInvoice({
                    org_id: org.id,
                    customer_id: invoiceForm.customer_id || null,
                    status: invoiceForm.status,
                    total: 0,
                    due_date: invoiceForm.due_date || null,
                  })
                }
                setInvoiceModalOpen(false)
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
            <select
              value={invoiceForm.customer_id}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={invoiceForm.status}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total (auto)</label>
              <div className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white">
                {editingInvoice ? `$${Number(editingInvoice.total || 0).toLocaleString()}` : '$0'}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due date</label>
            <input
              type="date"
              value={invoiceForm.due_date}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={paymentModalOpen}
        title={editingPayment ? 'Edit payment' : 'Record payment'}
        onClose={() => setPaymentModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                if (editingPayment) {
                  await salesService.updatePayment({
                    id: editingPayment.id,
                    invoice_id: paymentForm.invoice_id || null,
                    amount: Number(paymentForm.amount),
                    method: paymentForm.method,
                    paid_at: paymentForm.paid_at || null,
                    notes: paymentForm.notes || null,
                  })
                } else {
                  await salesService.createPayment({
                    org_id: org.id,
                    invoice_id: paymentForm.invoice_id || null,
                    amount: Number(paymentForm.amount),
                    method: paymentForm.method,
                    paid_at: paymentForm.paid_at || null,
                    notes: paymentForm.notes || null,
                  })
                }
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice</label>
            <select
              value={paymentForm.invoice_id}
              onChange={(e) => setPaymentForm({ ...paymentForm, invoice_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>{invoice.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input
                type="number"
                min="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Method</label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Paid at</label>
            <input
              type="datetime-local"
              value={paymentForm.paid_at}
              onChange={(e) => setPaymentForm({ ...paymentForm, paid_at: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={detailModalOpen}
        title="Invoice Details"
        onClose={() => setDetailModalOpen(false)}
        footer={(
          <button
            onClick={() => setDetailModalOpen(false)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            Close
          </button>
        )}
      >
        {selectedInvoice ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Invoice #{selectedInvoice.id.slice(0, 8)}</span>
              <span>Total: ${Number(selectedInvoice.total || 0).toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Customer: {customers.find((c) => c.id === selectedInvoice.customer_id)?.name || '—'}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Line Items</h4>
                <button
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => {
                    setEditingLine(null)
                    setLineForm({ product_id: '', qty: 1, unit_price: 0 })
                    setProductQuery('')
                    setLineModalOpen(true)
                  }}
                >
                  Add line
                </button>
              </div>
              {invoiceLines.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No line items.</p>
              ) : (
                <div className="space-y-2">
                  {invoiceLines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between text-sm">
                      <span>{products.find((p) => p.id === line.product_id)?.name || 'Item'}</span>
                      <span>{line.qty} × ${Number(line.unit_price || 0).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          onClick={() => {
                            setEditingLine(line)
                            setLineForm({
                              product_id: line.product_id || '',
                              qty: Number(line.qty || 1),
                              unit_price: Number(line.unit_price || 0),
                            })
                            const productName = products.find((p) => p.id === line.product_id)?.name || ''
                            setProductQuery(productName)
                            setLineModalOpen(true)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                          onClick={async () => {
                            await salesService.deleteInvoiceLine(line.id)
                            const lines = await salesService.getInvoiceLines(selectedInvoice.id)
                            setInvoiceLines(lines)
                            await salesService.updateInvoiceTotal(selectedInvoice.id)
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
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Payments</h4>
              {payments.filter((p) => p.invoice_id === selectedInvoice.id).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No payments recorded.</p>
              ) : (
                <div className="space-y-2">
                  {payments.filter((p) => p.invoice_id === selectedInvoice.id).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <span>${Number(payment.amount || 0).toLocaleString()}</span>
                      <span>{new Date(payment.paid_at || payment.created_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                          onClick={async () => {
                            await salesService.deletePayment(payment.id)
                            setRefreshKey((prev) => prev + 1)
                          }}
                        >
                          Delete
                        </button>
                        <button
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          onClick={() => {
                            setRefundTarget(payment)
                            setRefundAmount(Number(payment.amount || 0))
                            setRefundError(null)
                            setRefundReason('')
                          }}
                        >
                          Refund
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No invoice selected.</p>
        )}
      </Modal>

      <Modal
        open={lineModalOpen}
        title={editingLine ? 'Edit line item' : 'Add line item'}
        onClose={() => setLineModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setLineModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!selectedInvoice) return
                if (editingLine) {
                  await salesService.updateInvoiceLine({
                    id: editingLine.id,
                    product_id: lineForm.product_id || null,
                    qty: Number(lineForm.qty),
                    unit_price: Number(lineForm.unit_price),
                  })
                } else {
                  await salesService.createInvoiceLine({
                    invoice_id: selectedInvoice.id,
                    product_id: lineForm.product_id || null,
                    qty: Number(lineForm.qty),
                    unit_price: Number(lineForm.unit_price),
                  })
                }
                const lines = await salesService.getInvoiceLines(selectedInvoice.id)
                setInvoiceLines(lines)
                setLineModalOpen(false)
                await salesService.updateInvoiceTotal(selectedInvoice.id)
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product</label>
            <input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Search products..."
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            {productQuery.trim() && (
              <div className="mt-2 max-h-40 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {products
                  .filter((product) => product.name.toLowerCase().includes(productQuery.toLowerCase()))
                  .slice(0, 8)
                  .map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setLineForm({ ...lineForm, product_id: product.id })
                        setProductQuery(product.name)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {product.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
              <input
                type="number"
                min="1"
                value={lineForm.qty}
                onChange={(e) => setLineForm({ ...lineForm, qty: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit price</label>
              <input
                type="number"
                min="0"
                value={lineForm.unit_price}
                onChange={(e) => setLineForm({ ...lineForm, unit_price: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(refundTarget)}
        title="Refund payment"
        onClose={() => setRefundTarget(null)}
        footer={(
          <>
            <button
              onClick={() => setRefundTarget(null)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id || !refundTarget) return
                const maxRefund = Math.max(Number(refundTarget.amount || 0), 0)
                if (refundAmount <= 0 || refundAmount > maxRefund) {
                  setRefundError(`Refund must be between 0 and ${maxRefund}.`)
                  return
                }
                await salesService.createPayment({
                  org_id: org.id,
                  invoice_id: refundTarget.invoice_id || null,
                  amount: -Math.abs(Number(refundAmount || 0)),
                  method: `refund:${refundTarget.method || 'manual'}`,
                  paid_at: new Date().toISOString(),
                  notes: refundReason || null,
                })
                setRefundTarget(null)
                setRefundAmount(0)
                setRefundReason('')
                setRefundError(null)
                setRefreshKey((prev) => prev + 1)
              }}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              Confirm refund
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This will record a negative payment to reflect the refund.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Refund amount</label>
            <input
              type="number"
              min="0"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Refund reason</label>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          {refundError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{refundError}</p>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
