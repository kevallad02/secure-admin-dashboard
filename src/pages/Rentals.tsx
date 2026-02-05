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
  available: 'bg-green-100 text-green-800  ',
  rented: 'bg-yellow-100 text-yellow-800  ',
  service: 'bg-gray-100 text-gray-800  ',
  retired: 'bg-red-100 text-red-800  ',
  open: 'bg-yellow-100 text-yellow-800  ',
  paid: 'bg-green-100 text-green-800  ',
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
  const [contractLines, setContractLines] = useState<any[]>([])
  const [linesLoading, setLinesLoading] = useState(false)

  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [chargeModalOpen, setChargeModalOpen] = useState(false)

  const [editingAsset, setEditingAsset] = useState<any | null>(null)
  const [editingContract, setEditingContract] = useState<any | null>(null)
  const [editingCharge, setEditingCharge] = useState<any | null>(null)
  const [editingLine, setEditingLine] = useState<any | null>(null)

  const [assetForm, setAssetForm] = useState({ product_id: '', serial: '', status: 'available', condition: '' })
  const [contractForm, setContractForm] = useState({ customer_id: '', start_date: '', end_date: '', billing_cycle: 'monthly', total: 0 })
  const [eventForm, setEventForm] = useState({ contract_id: '', asset_id: '', event_type: 'checkout', notes: '' })
  const [chargeForm, setChargeForm] = useState({ contract_id: '', asset_id: '', amount: 0, status: 'open', due_date: '' })
  const [lineForm, setLineForm] = useState({ asset_id: '', rate: 0, frequency: 'monthly' })

  const [chargeRunning, setChargeRunning] = useState(false)
  const [chargeMessage, setChargeMessage] = useState('')
  const [lastChargeRun, setLastChargeRun] = useState<string | null>(null)

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

  const chargeStorageKey = useMemo(() => (org?.id ? `rentalChargeGen:${org.id}` : 'rentalChargeGen:unknown'), [org?.id])

  const formatLocalDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const runChargeGeneration = async (mode: 'auto' | 'manual') => {
    if (!org?.id) return
    const today = formatLocalDateKey(new Date())
    const lastRun = localStorage.getItem(chargeStorageKey)

    if (mode === 'auto' && lastRun === today) {
      setLastChargeRun(lastRun)
      return
    }

    setChargeRunning(true)
    setChargeMessage(mode === 'auto' ? 'Auto-generating charges...' : 'Generating charges...')
    const ok = await rentalsService.generateCharges(org.id)
    setChargeRunning(false)

    if (ok) {
      localStorage.setItem(chargeStorageKey, today)
      setLastChargeRun(today)
      setChargeMessage(mode === 'auto' ? 'Auto-generated charges for today.' : 'Charges generated.')
      setRefreshKey((prev) => prev + 1)
    } else {
      setChargeMessage('Charge generation failed. Please try again.')
    }
  }

  useEffect(() => {
    if (!org?.id) return
    const stored = localStorage.getItem(chargeStorageKey)
    setLastChargeRun(stored)
    void runChargeGeneration('auto')
  }, [org?.id, chargeStorageKey])

  const loadContractLines = async (contractId: string) => {
    setLinesLoading(true)
    const lines = await rentalsService.getLines(contractId)
    setContractLines(lines)
    setLinesLoading(false)
  }

  const contractLineTotal = useMemo(() => {
    return contractLines.reduce((sum, line) => sum + Number(line.rate || 0), 0)
  }, [contractLines])

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
          <span className={`badge ${statusClasses[asset.status] || statusClasses.available}`}>
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
              setEditingLine(null)
              setLineForm({ asset_id: '', rate: 0, frequency: 'monthly' })
              setContractForm({
                customer_id: contract.customer_id || '',
                start_date: contract.start_date || '',
                end_date: contract.end_date || '',
                billing_cycle: contract.billing_cycle || 'monthly',
                total: Number(contract.total || 0),
              })
              setContractModalOpen(true)
              void loadContractLines(contract.id)
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
          <span className="text-xs text-gray-500">Logged</span>
        ),
      })))
    } else if (activeTab === 'charges') {
      setRows(charges.map((charge) => ({
        charge: charge.id.slice(0, 8),
        contract: charge.contract_id.slice(0, 8),
        amount: `$${Number(charge.amount || 0).toLocaleString()}`,
        status: (
          <span className={`badge ${statusClasses[charge.status] || statusClasses.open}`}>
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

  const assetStats = useMemo(() => {
    const total = assets.length
    const retired = assets.filter((asset) => asset.status === 'retired').length
    const active = Math.max(0, total - retired)
    const rented = assets.filter((asset) => asset.status === 'rented').length
    const available = assets.filter((asset) => asset.status === 'available').length
    const service = assets.filter((asset) => asset.status === 'service').length
    const utilization = active > 0 ? rented / active : 0
    const availability = active > 0 ? available / active : 0

    return {
      total,
      active,
      rented,
      available,
      service,
      retired,
      utilization,
      availability,
    }
  }, [assets])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Rentals"
          subtitle="Manage assets, contracts, and recurring charges."
          actions={(
            <>
              {activeTab === 'charges' && (
                <button
                  className="inline-flex items-center px-4 py-2 rounded-md border border-primary-600 text-primary-700 text-sm font-medium hover:bg-primary-50"
                  onClick={() => void runChargeGeneration('manual')}
                  disabled={chargeRunning}
                >
                  {chargeRunning ? 'Generating...' : 'Generate charges'}
                </button>
              )}
              <button
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                onClick={() => {
                  if (activeTab === 'assets') {
                    setEditingAsset(null)
                    setAssetForm({ product_id: '', serial: '', status: 'available', condition: '' })
                    setAssetModalOpen(true)
                  } else if (activeTab === 'rentals') {
                    setEditingContract(null)
                    setEditingLine(null)
                    setLineForm({ asset_id: '', rate: 0, frequency: 'monthly' })
                    setContractForm({ customer_id: '', start_date: '', end_date: '', billing_cycle: 'monthly', total: 0 })
                    setContractLines([])
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
            </>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total assets', value: assetStats.total.toLocaleString() },
            { label: 'Available now', value: assetStats.available.toLocaleString() },
            { label: 'Rented now', value: assetStats.rented.toLocaleString() },
            { label: 'Utilization', value: `${(assetStats.utilization * 100).toFixed(1)}%` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="app-shell shadow rounded-lg border border-gray-200 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">
                Active: {assetStats.active} · Service: {assetStats.service} · Retired: {assetStats.retired}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-2 rounded-md text-sm font-medium border ${ activeTab === tab.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 ' }`}
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
            className="w-full sm:w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>

        {activeTab === 'charges' && (
          <div className="app-shell shadow rounded-lg border border-gray-200 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Recurring charge schedule</p>
              <p className="text-xs text-gray-500">
                Auto-generates daily on first visit. Last run: {lastChargeRun || 'Not yet run'}
              </p>
              {chargeMessage && (
                <p className="text-xs text-gray-500 mt-1">{chargeMessage}</p>
              )}
            </div>
            <button
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => void runChargeGeneration('manual')}
              disabled={chargeRunning}
            >
              {chargeRunning ? 'Generating...' : 'Run now'}
            </button>
          </div>
        )}

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
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
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
            <label className="block text-sm font-medium text-gray-700">Product</label>
            <select
              value={assetForm.product_id}
              onChange={(e) => setAssetForm({ ...assetForm, product_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Serial</label>
              <input
                type="text"
                value={assetForm.serial}
                onChange={(e) => setAssetForm({ ...assetForm, serial: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={assetForm.status}
                onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="service">Service</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Condition</label>
            <input
              type="text"
              value={assetForm.condition}
              onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
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
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
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
                    total: Number(contractLineTotal || contractForm.total),
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
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <select
              value={contractForm.customer_id}
              onChange={(e) => setContractForm({ ...contractForm, customer_id: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700">Start date</label>
              <input
                type="date"
                value={contractForm.start_date}
                onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End date</label>
              <input
                type="date"
                value={contractForm.end_date}
                onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Billing cycle</label>
              <select
                value={contractForm.billing_cycle}
                onChange={(e) => setContractForm({ ...contractForm, billing_cycle: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total</label>
              <input
                type="number"
                min="0"
                value={editingContract ? contractLineTotal : contractForm.total}
                onChange={(e) => setContractForm({ ...contractForm, total: Number(e.target.value) })}
                disabled={Boolean(editingContract)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
              {editingContract && (
                <p className="mt-1 text-xs text-gray-500">Auto-calculated from line items.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Line items</h3>
              <p className="text-xs text-gray-500">Assets + rates that drive recurring charges.</p>
            </div>
            {!editingContract && (
              <span className="text-xs text-gray-500">Save contract to add items.</span>
            )}
          </div>

          {editingContract && (
            <div className="mt-4 space-y-3">
              {linesLoading ? (
                <p className="text-xs text-gray-500">Loading line items...</p>
              ) : contractLines.length === 0 ? (
                <p className="text-xs text-gray-500">No line items yet.</p>
              ) : (
                <div className="space-y-2">
                  {contractLines.map((line) => {
                    const asset = assets.find((item) => item.id === line.asset_id)
                    const assetLabel = asset?.serial || line.asset_id?.slice(0, 8) || 'Unassigned'
                    return (
                      <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{assetLabel}</p>
                          <p className="text-xs text-gray-500">
                            ${Number(line.rate || 0).toLocaleString()} · {line.frequency}
                            {line.next_charge_date ? ` · Next ${new Date(line.next_charge_date).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <button
                            className="text-primary-600 hover:text-primary-700"
                            onClick={() => {
                              setEditingLine(line)
                              setLineForm({
                                asset_id: line.asset_id || '',
                                rate: Number(line.rate || 0),
                                frequency: line.frequency || 'monthly',
                              })
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-500 hover:text-red-600"
                            onClick={async () => {
                              await rentalsService.deleteLine(line.id)
                              await rentalsService.updateContractTotal(editingContract.id)
                              await loadContractLines(editingContract.id)
                              setRefreshKey((prev) => prev + 1)
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Asset</label>
                  <select
                    value={lineForm.asset_id}
                    onChange={(e) => setLineForm({ ...lineForm, asset_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Select asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.serial || asset.id.slice(0, 8)} ({asset.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Rate</label>
                  <input
                    type="number"
                    min="0"
                    value={lineForm.rate}
                    onChange={(e) => setLineForm({ ...lineForm, rate: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Frequency</label>
                  <select
                    value={lineForm.frequency}
                    onChange={(e) => setLineForm({ ...lineForm, frequency: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center px-3 py-2 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
                  onClick={async () => {
                    if (!editingContract) return
                    if (editingLine) {
                      await rentalsService.updateLine({
                        id: editingLine.id,
                        asset_id: lineForm.asset_id || null,
                        rate: Number(lineForm.rate),
                        frequency: lineForm.frequency,
                      })
                    } else {
                      await rentalsService.createLine({
                        contract_id: editingContract.id,
                        asset_id: lineForm.asset_id || null,
                        rate: Number(lineForm.rate),
                        frequency: lineForm.frequency,
                      })
                    }
                    await rentalsService.updateContractTotal(editingContract.id)
                    await loadContractLines(editingContract.id)
                    setRefreshKey((prev) => prev + 1)
                    setEditingLine(null)
                    setLineForm({ asset_id: '', rate: 0, frequency: 'monthly' })
                  }}
                >
                  {editingLine ? 'Update line' : 'Add line'}
                </button>
                {editingLine && (
                  <button
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => {
                      setEditingLine(null)
                      setLineForm({ asset_id: '', rate: 0, frequency: 'monthly' })
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
        open={eventModalOpen}
        title="Log check-in / check-out"
        onClose={() => setEventModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setEventModalOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
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
            <label className="block text-sm font-medium text-gray-700">Contract</label>
            <select
              value={eventForm.contract_id}
              onChange={(e) => setEventForm({ ...eventForm, contract_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select contract</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>{contract.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Asset</label>
            <select
              value={eventForm.asset_id}
              onChange={(e) => setEventForm({ ...eventForm, asset_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.serial || asset.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Event</label>
              <select
                value={eventForm.event_type}
                onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="checkout">Check-out</option>
                <option value="checkin">Check-in</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <input
                type="text"
                value={eventForm.notes}
                onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
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
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
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
            <label className="block text-sm font-medium text-gray-700">Contract</label>
            <select
              value={chargeForm.contract_id}
              onChange={(e) => setChargeForm({ ...chargeForm, contract_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select contract</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>{contract.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Asset</label>
            <select
              value={chargeForm.asset_id}
              onChange={(e) => setChargeForm({ ...chargeForm, asset_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.serial || asset.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                min="0"
                value={chargeForm.amount}
                onChange={(e) => setChargeForm({ ...chargeForm, amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={chargeForm.status}
                onChange={(e) => setChargeForm({ ...chargeForm, status: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="open">Open</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Due date</label>
            <input
              type="date"
              value={chargeForm.due_date}
              onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
