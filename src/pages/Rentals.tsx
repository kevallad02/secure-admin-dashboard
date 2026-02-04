import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import { rentalsService } from '../services/rentalsService'
import { useAuth } from '../context/AuthContext'
import { salesService } from '../services/salesService'
import { inventoryService } from '../services/inventoryService'
import Modal from '../components/Modal'

const tabs = [
  { id: 'assets', label: 'Assets' },
  { id: 'rentals', label: 'Rentals' },
  { id: 'check', label: 'Check-in / Check-out' },
  { id: 'charges', label: 'Recurring Charges' },
]

const statusClasses: Record<string, string> = {
  available: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  rented: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  service: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  retired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
}

export default function Rentals() {
  const { org } = useAuth()
  const [activeTab, setActiveTab] = useState<'assets' | 'rentals' | 'check' | 'charges'>('assets')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Array<Record<string, React.ReactNode>>>([])
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [assets, setAssets] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [charges, setCharges] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [chargeModalOpen, setChargeModalOpen] = useState(false)

  const [editingAsset, setEditingAsset] = useState<any | null>(null)
  const [editingContract, setEditingContract] = useState<any | null>(null)
  const [editingCharge, setEditingCharge] = useState<any | null>(null)

  const [assetForm, setAssetForm] = useState({ product_id: '', serial: '', status: 'available', condition: '' })
  const [contractForm, setContractForm] = useState({ customer_id: '', start_date: '', end_date: '', billing_cycle: 'monthly', total: 0 })
  const [eventForm, setEventForm] = useState({ contract_id: '', asset_id: '', event_type: 'checkout', notes: '' })
  const [chargeForm, setChargeForm] = useState({ contract_id: '', asset_id: '', amount: 0, status: 'open', due_date: '' })

  useEffect(() => {
    const load = async () => {
      if (!org?.id) return
      setLoading(true)
      const [assetData, contractData, eventData, chargeData, customerData] = await Promise.all([
        rentalsService.getAssets(org.id),
        rentalsService.getContracts(org.id),
        rentalsService.getEvents(org.id),
        rentalsService.getCharges(org.id),
        salesService.getCustomers(org.id),
      ])
      setAssets(assetData)
      setContracts(contractData)
      setEvents(eventData)
      setCharges(chargeData)
      setCustomers(customerData)
      const productData = await inventoryService.getProducts(org.id)
      setProducts(productData)
      setLoading(false)
    }
    load()
  }, [org?.id, refreshKey])

  const columns = useMemo(() => {
    if (activeTab === 'rentals') {
      return [
        { key: 'contract', header: 'Contract' },
        { key: 'customer', header: 'Customer' },
        { key: 'cycle', header: 'Cycle' },
        { key: 'total', header: 'Total' },
        { key: 'dates', header: 'Dates' },
        { key: 'actions', header: '' },
      ]
    }
    if (activeTab === 'check') {
      return [
        { key: 'event', header: 'Event' },
        { key: 'asset', header: 'Asset' },
        { key: 'contract', header: 'Contract' },
        { key: 'date', header: 'Date' },
        { key: 'actions', header: '' },
      ]
    }
    if (activeTab === 'charges') {
      return [
        { key: 'charge', header: 'Charge' },
        { key: 'contract', header: 'Contract' },
        { key: 'amount', header: 'Amount' },
        { key: 'status', header: 'Status' },
        { key: 'due', header: 'Due' },
        { key: 'actions', header: '' },
      ]
    }
    return [
      { key: 'asset', header: 'Asset' },
      { key: 'product', header: 'Product' },
      { key: 'status', header: 'Status' },
      { key: 'condition', header: 'Condition' },
      { key: 'actions', header: '' },
    ]
  }, [activeTab])

  useEffect(() => {
    setSearch('')
  }, [activeTab])

  useEffect(() => {
    const productName = new Map(products.map((p) => [p.id, p.name]))
    const customerName = new Map(customers.map((c) => [c.id, c.name]))

    if (activeTab === 'assets') {
      setRows(assets.map((asset) => ({
        asset: asset.serial || asset.id.slice(0, 8),
        product: productName.get(asset.product_id) || '—',
        status: (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[asset.status] || statusClasses.available}`}>
            {asset.status}
          </span>
        ),
        condition: asset.condition || '—',
        actions: (
          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={() => {
              setEditingAsset(asset)
              setAssetForm({
                product_id: asset.product_id || '',
                serial: asset.serial || '',
                status: asset.status || 'available',
                condition: asset.condition || '',
              })
              setAssetModalOpen(true)
            }}
          >
            Edit
          </button>
        ),
      })))
    } else if (activeTab === 'rentals') {
      setRows(contracts.map((contract) => ({
        contract: contract.id.slice(0, 8),
        customer: customerName.get(contract.customer_id) || '—',
        cycle: contract.billing_cycle,
        total: `$${Number(contract.total || 0).toLocaleString()}`,
        dates: `${contract.start_date} → ${contract.end_date || 'Open'}`,
        actions: (
          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={() => {
              setEditingContract(contract)
              setContractForm({
                customer_id: contract.customer_id || '',
                start_date: contract.start_date || '',
                end_date: contract.end_date || '',
                billing_cycle: contract.billing_cycle || 'monthly',
                total: Number(contract.total || 0),
              })
              setContractModalOpen(true)
            }}
          >
            Edit
          </button>
        ),
      })))
    } else if (activeTab === 'check') {
      setRows(events.map((event) => ({
        event: event.event_type,
        asset: assets.find((a) => a.id === event.asset_id)?.serial || event.asset_id?.slice(0, 8) || '—',
        contract: event.contract_id ? event.contract_id.slice(0, 8) : '—',
        date: new Date(event.event_date).toLocaleString(),
        actions: (
          <span className="text-xs text-gray-500 dark:text-gray-400">Logged</span>
        ),
      })))
    } else if (activeTab === 'charges') {
      setRows(charges.map((charge) => ({
        charge: charge.id.slice(0, 8),
        contract: charge.contract_id.slice(0, 8),
        amount: `$${Number(charge.amount || 0).toLocaleString()}`,
        status: (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[charge.status] || statusClasses.open}`}>
            {charge.status}
          </span>
        ),
        due: charge.due_date ? new Date(charge.due_date).toLocaleDateString() : '—',
        actions: (
          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={async () => {
              await rentalsService.updateCharge({
                id: charge.id,
                status: charge.status === 'paid' ? 'open' : 'paid',
                paid_at: charge.status === 'paid' ? null : new Date().toISOString(),
              })
              setRefreshKey((prev) => prev + 1)
            }}
          >
            {charge.status === 'paid' ? 'Mark open' : 'Mark paid'}
          </button>
        ),
      })))
    }
  }, [activeTab, assets, contracts, events, charges, customers, products])

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
          title="Rentals"
          subtitle="Manage assets, contracts, and recurring charges."
          actions={(
            <button
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              onClick={() => {
                if (activeTab === 'assets') {
                  setEditingAsset(null)
                  setAssetForm({ product_id: '', serial: '', status: 'available', condition: '' })
                  setAssetModalOpen(true)
                } else if (activeTab === 'rentals') {
                  setEditingContract(null)
                  setContractForm({ customer_id: '', start_date: '', end_date: '', billing_cycle: 'monthly', total: 0 })
                  setContractModalOpen(true)
                } else if (activeTab === 'check') {
                  setEventForm({ contract_id: '', asset_id: '', event_type: 'checkout', notes: '' })
                  setEventModalOpen(true)
                } else {
                  setEditingCharge(null)
                  setChargeForm({ contract_id: '', asset_id: '', amount: 0, status: 'open', due_date: '' })
                  setChargeModalOpen(true)
                }
              }}
            >
              {activeTab === 'assets' && 'Add asset'}
              {activeTab === 'rentals' && 'Create rental'}
              {activeTab === 'check' && 'Log event'}
              {activeTab === 'charges' && 'Add charge'}
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
          defaultSortKey={activeTab === 'assets' ? 'asset' : undefined}
        />
      </div>

      <Modal
        open={assetModalOpen}
        title={editingAsset ? 'Edit asset' : 'Add asset'}
        onClose={() => setAssetModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setAssetModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                if (editingAsset) {
                  await rentalsService.updateAsset({
                    id: editingAsset.id,
                    product_id: assetForm.product_id || null,
                    serial: assetForm.serial || null,
                    status: assetForm.status,
                    condition: assetForm.condition || null,
                  })
                } else {
                  await rentalsService.createAsset({
                    org_id: org.id,
                    product_id: assetForm.product_id || null,
                    serial: assetForm.serial || null,
                    status: assetForm.status,
                    condition: assetForm.condition || null,
                  })
                }
                setAssetModalOpen(false)
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
            <select
              value={assetForm.product_id}
              onChange={(e) => setAssetForm({ ...assetForm, product_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial</label>
              <input
                type="text"
                value={assetForm.serial}
                onChange={(e) => setAssetForm({ ...assetForm, serial: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={assetForm.status}
                onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="service">Service</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label>
            <input
              type="text"
              value={assetForm.condition}
              onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={contractModalOpen}
        title={editingContract ? 'Edit rental' : 'Create rental'}
        onClose={() => setContractModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setContractModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                if (editingContract) {
                  await rentalsService.updateContract({
                    id: editingContract.id,
                    customer_id: contractForm.customer_id || null,
                    start_date: contractForm.start_date,
                    end_date: contractForm.end_date || null,
                    billing_cycle: contractForm.billing_cycle,
                    total: Number(contractForm.total),
                  })
                } else {
                  await rentalsService.createContract({
                    org_id: org.id,
                    customer_id: contractForm.customer_id || null,
                    start_date: contractForm.start_date,
                    end_date: contractForm.end_date || null,
                    billing_cycle: contractForm.billing_cycle,
                    total: Number(contractForm.total),
                  })
                }
                setContractModalOpen(false)
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
              value={contractForm.customer_id}
              onChange={(e) => setContractForm({ ...contractForm, customer_id: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start date</label>
              <input
                type="date"
                value={contractForm.start_date}
                onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End date</label>
              <input
                type="date"
                value={contractForm.end_date}
                onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Billing cycle</label>
              <select
                value={contractForm.billing_cycle}
                onChange={(e) => setContractForm({ ...contractForm, billing_cycle: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
              <input
                type="number"
                min="0"
                value={contractForm.total}
                onChange={(e) => setContractForm({ ...contractForm, total: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={eventModalOpen}
        title="Log check-in / check-out"
        onClose={() => setEventModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setEventModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                await rentalsService.createEvent({
                  org_id: org.id,
                  contract_id: eventForm.contract_id || null,
                  asset_id: eventForm.asset_id || null,
                  event_type: eventForm.event_type,
                  notes: eventForm.notes || null,
                })
                if (eventForm.asset_id) {
                  await rentalsService.updateAssetStatus(
                    eventForm.asset_id,
                    eventForm.event_type === 'checkout' ? 'rented' : 'available'
                  )
                }
                setEventModalOpen(false)
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contract</label>
            <select
              value={eventForm.contract_id}
              onChange={(e) => setEventForm({ ...eventForm, contract_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select contract</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>{contract.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset</label>
            <select
              value={eventForm.asset_id}
              onChange={(e) => setEventForm({ ...eventForm, asset_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.serial || asset.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event</label>
              <select
                value={eventForm.event_type}
                onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="checkout">Check-out</option>
                <option value="checkin">Check-in</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <input
                type="text"
                value={eventForm.notes}
                onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={chargeModalOpen}
        title={editingCharge ? 'Edit charge' : 'Add charge'}
        onClose={() => setChargeModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setChargeModalOpen(false)}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!org?.id) return
                if (editingCharge) {
                  await rentalsService.updateCharge({
                    id: editingCharge.id,
                    status: chargeForm.status,
                    paid_at: chargeForm.status === 'paid' ? new Date().toISOString() : null,
                  })
                } else {
                  await rentalsService.createCharge({
                    org_id: org.id,
                    contract_id: chargeForm.contract_id,
                    asset_id: chargeForm.asset_id || null,
                    amount: Number(chargeForm.amount),
                    status: chargeForm.status,
                    due_date: chargeForm.due_date || null,
                  })
                }
                setChargeModalOpen(false)
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contract</label>
            <select
              value={chargeForm.contract_id}
              onChange={(e) => setChargeForm({ ...chargeForm, contract_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select contract</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>{contract.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset</label>
            <select
              value={chargeForm.asset_id}
              onChange={(e) => setChargeForm({ ...chargeForm, asset_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.serial || asset.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input
                type="number"
                min="0"
                value={chargeForm.amount}
                onChange={(e) => setChargeForm({ ...chargeForm, amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={chargeForm.status}
                onChange={(e) => setChargeForm({ ...chargeForm, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="open">Open</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due date</label>
            <input
              type="date"
              value={chargeForm.due_date}
              onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
