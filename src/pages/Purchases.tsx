import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import { purchaseService } from '../services/purchaseService'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { inventoryService } from '../services/inventoryService'

const tabs = [
  { id: 'vendors', label: 'Vendors' },
  { id: 'orders', label: 'Purchase Orders' },
  { id: 'receipts', label: 'Receipts' },
]

const statusClasses: Record<string, string> = {
  received: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

export default function Purchases() {
  const { org } = useAuth()
  const [activeTab, setActiveTab] = useState<'vendors' | 'orders' | 'receipts'>('vendors')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Array<Record<string, React.ReactNode>>>([])
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [vendors, setVendors] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const [vendorModalOpen, setVendorModalOpen] = useState(false)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [poDetailOpen, setPoDetailOpen] = useState(false)
  const [receiptDetailOpen, setReceiptDetailOpen] = useState(false)

  const [editingVendor, setEditingVendor] = useState<any | null>(null)
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<any | null>(null)
  const [selectedPO, setSelectedPO] = useState<any | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null)
  const [poLines, setPoLines] = useState<any[]>([])
  const [receiptLines, setReceiptLines] = useState<any[]>([])

  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '' })
  const [orderForm, setOrderForm] = useState({ vendor_id: '', status: 'draft', total: 0, ordered_at: '' })
  const [receiptForm, setReceiptForm] = useState({ po_id: '', status: 'received', total: 0, received_at: '' })
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<any | null>(null)
  const [lineForm, setLineForm] = useState({ product_id: '', qty: 1, unit_cost: 0 })
  const [lineContext, setLineContext] = useState<'po' | 'receipt'>('po')
  const [productQuery, setProductQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!org?.id) return
      setLoading(true)
      const [vendorData, orderData, receiptData] = await Promise.all([
        purchaseService.getVendors(org.id),
        purchaseService.getPurchaseOrders(org.id),
        purchaseService.getReceipts(org.id),
      ])
      setVendors(vendorData)
      setOrders(orderData)
      setReceipts(receiptData)
      const productData = await inventoryService.getProducts(org.id)
      setProducts(productData)
      setLoading(false)
    }
    load()
  }, [org?.id, refreshKey])

  const columns = useMemo(() => {
    if (activeTab === 'orders') {
      return [
        { key: 'po', header: 'PO #' },
        { key: 'vendor', header: 'Vendor' },
        { key: 'status', header: 'Status' },
        { key: 'total', header: 'Total' },
        { key: 'date', header: 'Ordered' },
        { key: 'actions', header: '' },
      ]
    }
    if (activeTab === 'receipts') {
      return [
        { key: 'receipt', header: 'Receipt #' },
        { key: 'po', header: 'PO #' },
        { key: 'status', header: 'Status' },
        { key: 'total', header: 'Total' },
        { key: 'date', header: 'Received' },
        { key: 'actions', header: '' },
      ]
    }
    return [
      { key: 'vendor', header: 'Vendor' },
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
    if (activeTab === 'vendors') {
      setRows(vendors.map((vendor) => ({
        vendor: vendor.name,
        email: vendor.contact?.email || '—',
        phone: vendor.contact?.phone || '—',
        created: new Date(vendor.created_at).toLocaleDateString(),
        actions: (
          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={() => {
              setEditingVendor(vendor)
              setVendorForm({
                name: vendor.name || '',
                email: vendor.contact?.email || '',
                phone: vendor.contact?.phone || '',
              })
              setVendorModalOpen(true)
            }}
          >
            Edit
          </button>
        ),
      })))
    } else if (activeTab === 'orders') {
      const mapVendorName = new Map(vendors.map((v) => [v.id, v.name]))
      setRows(orders.map((order) => ({
        po: order.id.slice(0, 8),
        vendor: mapVendorName.get(order.vendor_id) || '—',
        status: (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[order.status] || statusClasses.draft}`}>
            {order.status}
          </span>
        ),
        total: `$${Number(order.total || 0).toLocaleString()}`,
        date: order.ordered_at ? new Date(order.ordered_at).toLocaleDateString() : '—',
        actions: (
          <div className="flex items-center gap-2">
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={() => {
                setEditingOrder(order)
                setOrderForm({
                  vendor_id: order.vendor_id || '',
                  status: order.status || 'draft',
                  total: Number(order.total || 0),
                  ordered_at: order.ordered_at ? order.ordered_at.slice(0, 10) : '',
                })
                setOrderModalOpen(true)
              }}
            >
              Edit
            </button>
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={async () => {
                const lines = await purchaseService.getPurchaseOrderLines(order.id)
                setSelectedPO(order)
                setPoLines(lines)
                setPoDetailOpen(true)
              }}
            >
              Lines
            </button>
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={async () => {
                if (!org?.id) return
                await purchaseService.createReceiptFromPO({ org_id: org.id, po_id: order.id })
                setRefreshKey((prev) => prev + 1)
              }}
            >
              Receive
            </button>
          </div>
        ),
      })))
    } else if (activeTab === 'receipts') {
      setRows(receipts.map((receipt) => ({
        receipt: receipt.id.slice(0, 8),
        po: receipt.po_id ? receipt.po_id.slice(0, 8) : '—',
        status: (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[receipt.status] || statusClasses.open}`}>
            {receipt.status}
          </span>
        ),
        total: `$${Number(receipt.total || 0).toLocaleString()}`,
        date: receipt.received_at ? new Date(receipt.received_at).toLocaleDateString() : '—',
        actions: (
          <div className="flex items-center gap-2">
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={() => {
                setEditingReceipt(receipt)
                setReceiptForm({
                  po_id: receipt.po_id || '',
                  status: receipt.status || 'received',
                  total: Number(receipt.total || 0),
                  received_at: receipt.received_at ? receipt.received_at.slice(0, 10) : '',
                })
                setReceiptModalOpen(true)
              }}
            >
              Edit
            </button>
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={async () => {
                const lines = await purchaseService.getReceiptLines(receipt.id)
                setSelectedReceipt(receipt)
                setReceiptLines(lines)
                setReceiptDetailOpen(true)
              }}
            >
              Lines
            </button>
          </div>
        ),
      })))
    }
  }, [activeTab, vendors, orders, receipts])

  const vendorAging = useMemo(() => {
    const now = new Date()
    const receiptsByPO = receipts.reduce<Record<string, number>>((acc, receipt) => {
      if (!receipt.po_id) return acc
      acc[receipt.po_id] = (acc[receipt.po_id] || 0) + Number(receipt.total || 0)
      return acc
    }, {})

    const buckets: Record<string, { balance: number; b0: number; b30: number; b60: number; b90: number }> = {}

    orders.forEach((order) => {
      const vendorId = order.vendor_id || 'unknown'
      const orderedAt = order.ordered_at ? new Date(order.ordered_at) : new Date(order.created_at)
      const ageDays = Math.floor((now.getTime() - orderedAt.getTime()) / (1000 * 60 * 60 * 24))
      const receivedTotal = receiptsByPO[order.id] || 0
      const remaining = Math.max(Number(order.total || 0) - receivedTotal, 0)

      if (!buckets[vendorId]) {
        buckets[vendorId] = { balance: 0, b0: 0, b30: 0, b60: 0, b90: 0 }
      }
      buckets[vendorId].balance += remaining
      if (ageDays <= 30) buckets[vendorId].b0 += remaining
      else if (ageDays <= 60) buckets[vendorId].b30 += remaining
      else if (ageDays <= 90) buckets[vendorId].b60 += remaining
      else buckets[vendorId].b90 += remaining
    })

    return vendors.map((vendor) => ({
      vendor: vendor.name,
      balance: buckets[vendor.id]?.balance || 0,
      b0: buckets[vendor.id]?.b0 || 0,
      b30: buckets[vendor.id]?.b30 || 0,
      b60: buckets[vendor.id]?.b60 || 0,
      b90: buckets[vendor.id]?.b90 || 0,
    }))
  }, [vendors, orders, receipts])

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
          title="Purchases"
          subtitle="Manage vendors, purchase orders, and receipts."
          actions={(
            <button
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              onClick={() => {
                if (activeTab === 'vendors') {
                  setEditingVendor(null)
                  setVendorForm({ name: '', email: '', phone: '' })
                  setVendorModalOpen(true)
                } else if (activeTab === 'orders') {
                  setEditingOrder(null)
                  setOrderForm({ vendor_id: '', status: 'draft', total: 0, ordered_at: '' })
                  setOrderModalOpen(true)
                } else {
                  setEditingReceipt(null)
                  setReceiptForm({ po_id: '', status: 'received', total: 0, received_at: '' })
                  setReceiptModalOpen(true)
                }
              }}
            >
              {activeTab === 'vendors' && 'Add vendor'}
              {activeTab === 'orders' && 'Create PO'}
              {activeTab === 'receipts' && 'Create receipt'}
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
          defaultSortKey={activeTab === 'vendors' ? 'vendor' : undefined}
        />

        {activeTab === 'vendors' && (
          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Vendor Balance & Aging</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-4">Vendor</th>
                    <th className="py-2 pr-4">Balance</th>
                    <th className="py-2 pr-4">0-30</th>
                    <th className="py-2 pr-4">31-60</th>
                    <th className="py-2 pr-4">61-90</th>
                    <th className="py-2 pr-4">90+</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {vendorAging.map((row) => (
                    <tr key={row.vendor}>
                      <td className="py-2 pr-4 text-gray-900 dark:text-white">{row.vendor}</td>
                      <td className="py-2 pr-4">${row.balance.toLocaleString()}</td>
                      <td className="py-2 pr-4">${row.b0.toLocaleString()}</td>
                      <td className="py-2 pr-4">${row.b30.toLocaleString()}</td>
                      <td className="py-2 pr-4">${row.b60.toLocaleString()}</td>
                      <td className="py-2 pr-4">${row.b90.toLocaleString()}</td>
                    </tr>
                  ))}
                  {vendorAging.length === 0 && (
                    <tr>
                      <td className="py-4 text-gray-500 dark:text-gray-400" colSpan={6}>
                        No vendor balances yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={vendorModalOpen}
        title={editingVendor ? 'Edit vendor' : 'Add vendor'}
        onClose={() => setVendorModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setVendorModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id || !vendorForm.name.trim()) return
                if (editingVendor) {
                  await purchaseService.updateVendor({
                    id: editingVendor.id,
                    name: vendorForm.name.trim(),
                    contact: { email: vendorForm.email, phone: vendorForm.phone },
                  })
                } else {
                  await purchaseService.createVendor({
                    org_id: org.id,
                    name: vendorForm.name.trim(),
                    contact: { email: vendorForm.email, phone: vendorForm.phone },
                  })
                }
                setVendorModalOpen(false)
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
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={vendorForm.email}
              onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
            <input
              type="text"
              value={vendorForm.phone}
              onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={orderModalOpen}
        title={editingOrder ? 'Edit purchase order' : 'Create purchase order'}
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
                  await purchaseService.updatePurchaseOrder({
                    id: editingOrder.id,
                    vendor_id: orderForm.vendor_id || null,
                    status: orderForm.status,
                    total: Number(orderForm.total),
                    ordered_at: orderForm.ordered_at || null,
                  })
                } else {
                  await purchaseService.createPurchaseOrder({
                    org_id: org.id,
                    vendor_id: orderForm.vendor_id || null,
                    status: orderForm.status,
                    total: Number(orderForm.total),
                    ordered_at: orderForm.ordered_at || null,
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vendor</label>
            <select
              value={orderForm.vendor_id}
              onChange={(e) => setOrderForm({ ...orderForm, vendor_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
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
                <option value="received">Received</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ordered at</label>
            <input
              type="date"
              value={orderForm.ordered_at}
              onChange={(e) => setOrderForm({ ...orderForm, ordered_at: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={receiptModalOpen}
        title={editingReceipt ? 'Edit receipt' : 'Create receipt'}
        onClose={() => setReceiptModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setReceiptModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                if (editingReceipt) {
                  await purchaseService.updateReceipt({
                    id: editingReceipt.id,
                    po_id: receiptForm.po_id || null,
                    status: receiptForm.status,
                    total: Number(receiptForm.total),
                    received_at: receiptForm.received_at || null,
                  })
                } else {
                  await purchaseService.createReceipt({
                    org_id: org.id,
                    po_id: receiptForm.po_id || null,
                    status: receiptForm.status,
                    total: Number(receiptForm.total),
                    received_at: receiptForm.received_at || null,
                  })
                }
                setReceiptModalOpen(false)
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Order</label>
            <select
              value={receiptForm.po_id}
              onChange={(e) => setReceiptForm({ ...receiptForm, po_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select PO</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>{order.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={receiptForm.status}
                onChange={(e) => setReceiptForm({ ...receiptForm, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="received">Received</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
              <input
                type="number"
                min="0"
                value={receiptForm.total}
                onChange={(e) => setReceiptForm({ ...receiptForm, total: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Received at</label>
            <input
              type="date"
              value={receiptForm.received_at}
              onChange={(e) => setReceiptForm({ ...receiptForm, received_at: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={poDetailOpen}
        title="Purchase Order Lines"
        onClose={() => setPoDetailOpen(false)}
        footer={(
          <button
            onClick={() => setPoDetailOpen(false)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            Close
          </button>
        )}
      >
        {selectedPO ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>PO #{selectedPO.id.slice(0, 8)}</span>
              <span>Total: ${Number(selectedPO.total || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Line Items</h4>
              <button
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
                onClick={() => {
                  setLineContext('po')
                  setEditingLine(null)
                  setLineForm({ product_id: '', qty: 1, unit_cost: 0 })
                  setProductQuery('')
                  setLineModalOpen(true)
                }}
              >
                Add line
              </button>
            </div>
            {poLines.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No line items.</p>
            ) : (
              <div className="space-y-2">
                {poLines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between text-sm">
                    <span>{products.find((p) => p.id === line.product_id)?.name || 'Item'}</span>
                    <span>{line.qty} × ${Number(line.unit_cost || 0).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        onClick={() => {
                          setLineContext('po')
                          setEditingLine(line)
                          setLineForm({
                            product_id: line.product_id || '',
                            qty: Number(line.qty || 1),
                            unit_cost: Number(line.unit_cost || 0),
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
                          await purchaseService.deletePurchaseOrderLine(line.id)
                          const lines = await purchaseService.getPurchaseOrderLines(selectedPO.id)
                          setPoLines(lines)
                          await purchaseService.updatePurchaseOrderTotal(selectedPO.id)
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
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No PO selected.</p>
        )}
      </Modal>

      <Modal
        open={receiptDetailOpen}
        title="Receipt Lines"
        onClose={() => setReceiptDetailOpen(false)}
        footer={(
          <button
            onClick={() => setReceiptDetailOpen(false)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            Close
          </button>
        )}
      >
        {selectedReceipt ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Receipt #{selectedReceipt.id.slice(0, 8)}</span>
              <span>Total: ${Number(selectedReceipt.total || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Line Items</h4>
              <button
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
                onClick={() => {
                  setLineContext('receipt')
                  setEditingLine(null)
                  setLineForm({ product_id: '', qty: 1, unit_cost: 0 })
                  setProductQuery('')
                  setLineModalOpen(true)
                }}
              >
                Add line
              </button>
            </div>
            {receiptLines.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No line items.</p>
            ) : (
              <div className="space-y-2">
                {receiptLines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between text-sm">
                    <span>{products.find((p) => p.id === line.product_id)?.name || 'Item'}</span>
                    <span>{line.qty} × ${Number(line.unit_cost || 0).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        onClick={() => {
                          setLineContext('receipt')
                          setEditingLine(line)
                          setLineForm({
                            product_id: line.product_id || '',
                            qty: Number(line.qty || 1),
                            unit_cost: Number(line.unit_cost || 0),
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
                          await purchaseService.deleteReceiptLine(line.id)
                          const lines = await purchaseService.getReceiptLines(selectedReceipt.id)
                          setReceiptLines(lines)
                          await purchaseService.updateReceiptTotal(selectedReceipt.id)
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
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No receipt selected.</p>
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
                if (lineContext === 'po' && selectedPO) {
                  if (editingLine) {
                    await purchaseService.updatePurchaseOrderLine({
                      id: editingLine.id,
                      product_id: lineForm.product_id || null,
                      qty: Number(lineForm.qty),
                      unit_cost: Number(lineForm.unit_cost),
                    })
                  } else {
                    await purchaseService.createPurchaseOrderLine({
                      po_id: selectedPO.id,
                      product_id: lineForm.product_id || null,
                      qty: Number(lineForm.qty),
                      unit_cost: Number(lineForm.unit_cost),
                    })
                  }
                  const lines = await purchaseService.getPurchaseOrderLines(selectedPO.id)
                  setPoLines(lines)
                  await purchaseService.updatePurchaseOrderTotal(selectedPO.id)
                  setRefreshKey((prev) => prev + 1)
                }
                if (lineContext === 'receipt' && selectedReceipt) {
                  if (editingLine) {
                    await purchaseService.updateReceiptLine({
                      id: editingLine.id,
                      product_id: lineForm.product_id || null,
                      qty: Number(lineForm.qty),
                      unit_cost: Number(lineForm.unit_cost),
                    })
                  } else {
                    await purchaseService.createReceiptLine({
                      receipt_id: selectedReceipt.id,
                      product_id: lineForm.product_id || null,
                      qty: Number(lineForm.qty),
                      unit_cost: Number(lineForm.unit_cost),
                    })
                  }
                  const lines = await purchaseService.getReceiptLines(selectedReceipt.id)
                  setReceiptLines(lines)
                  await purchaseService.updateReceiptTotal(selectedReceipt.id)
                  setRefreshKey((prev) => prev + 1)
                }
                setLineModalOpen(false)
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit cost</label>
              <input
                type="number"
                min="0"
                value={lineForm.unit_cost}
                onChange={(e) => setLineForm({ ...lineForm, unit_cost: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
