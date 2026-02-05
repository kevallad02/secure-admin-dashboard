import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'
import { inventoryService } from '../services/inventoryService'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { orgService } from '../services/orgService'

export default function Inventory() {
  const { org } = useAuth()
  const [activeTab, setActiveTab] = useState<'products' | 'locations' | 'stock' | 'transfers'>('products')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Array<Record<string, React.ReactNode>>>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)

  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null)

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editingLocation, setEditingLocation] = useState<any | null>(null)

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferForm, setTransferForm] = useState({
    product_id: '',
    from_location_id: '',
    to_location_id: '',
    qty: 1,
  })
  const [transferError, setTransferError] = useState<string | null>(null)
  const [availableQty, setAvailableQty] = useState<number | null>(null)

  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    type: 'stock',
    unit_id: '',
    category_id: '',
    track_inventory: true,
    is_active: true,
  })

  const [locationForm, setLocationForm] = useState({
    name: '',
    type: 'warehouse',
  })

  const columns = useMemo(() => {
    if (activeTab === 'locations') {
      return [
        { key: 'name', header: 'Location' },
        { key: 'type', header: 'Type' },
        { key: 'actions', header: '' },
      ]
    }
    if (activeTab === 'stock') {
      return [
        { key: 'product', header: 'Product' },
        { key: 'location', header: 'Location' },
        { key: 'onHand', header: 'On Hand' },
        { key: 'reserved', header: 'Reserved' },
      ]
    }
    if (activeTab === 'transfers') {
      return [
        { key: 'product', header: 'Product' },
        { key: 'from', header: 'From' },
        { key: 'to', header: 'To' },
        { key: 'qty', header: 'Qty' },
        { key: 'date', header: 'Date' },
        { key: 'ref', header: 'Ref' },
        { key: 'actions', header: '' },
      ]
    }
    return [
      { key: 'name', header: 'Product' },
      { key: 'sku', header: 'SKU' },
      { key: 'type', header: 'Type' },
      { key: 'status', header: 'Status' },
      { key: 'actions', header: '' },
    ]
  }, [activeTab])

  useEffect(() => {
    const load = async () => {
      if (!org?.id) return
      setLoading(true)
      const [unitData, categoryData] = await Promise.all([
        orgService.getDefaultUnits(org.id),
        orgService.getDefaultCategories(org.id),
      ])
      setUnits(unitData)
      setCategories(categoryData)

      if (activeTab === 'locations') {
        const data = await inventoryService.getLocations(org.id)
        setLocations(data)
        setRows(data.map((item) => ({
          name: item.name,
          type: item.type || 'warehouse',
          actions: (
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={() => {
                setEditingLocation(item)
                setLocationForm({
                  name: item.name,
                  type: item.type || 'warehouse',
                })
                setLocationModalOpen(true)
              }}
            >
              Edit
            </button>
          ),
        })))
      } else if (activeTab === 'stock') {
        const data = await inventoryService.getStockLevels(org.id)
        setRows(data.map((item) => ({
          product: item.product_name,
          location: item.location_name,
          onHand: item.qty_on_hand.toLocaleString(),
          reserved: item.qty_reserved.toLocaleString(),
        })))
      } else if (activeTab === 'transfers') {
        const data = await inventoryService.getTransfers(org.id)
        setRows(data.map((item) => ({
          product: item.product_name || 'Unknown',
          from: item.from_location || '—',
          to: item.to_location || '—',
          qty: item.qty.toLocaleString(),
          date: new Date(item.created_at).toLocaleDateString(),
          ref: String(item.id).slice(0, 8),
          actions: (
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={() => setSelectedTransfer(item)}
            >
              View
            </button>
          ),
        })))
      } else {
        const data = await inventoryService.getProducts(org.id)
        setProducts(data)
        setRows(data.map((item) => ({
          name: item.name,
          sku: item.sku || '—',
          type: item.type,
          status: item.is_active ? 'Active' : 'Inactive',
          actions: (
            <button
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={() => {
                setEditingProduct(item)
                setProductForm({
                  name: item.name,
                  sku: item.sku || '',
                  type: item.type,
                  unit_id: item.unit_id || '',
                  category_id: item.category_id || '',
                  track_inventory: true,
                  is_active: item.is_active,
                })
                setProductModalOpen(true)
              }}
            >
              Edit
            </button>
          ),
        })))
      }
      setLoading(false)
    }

    load()
  }, [activeTab, org?.id, refreshKey])

  useEffect(() => {
    setSearch('')
    setTypeFilter('all')
    setSelectedTransfer(null)
  }, [activeTab])

  useEffect(() => {
    const loadAvailable = async () => {
      if (!org?.id) return
      if (!transferForm.product_id || !transferForm.from_location_id) {
        setAvailableQty(null)
        return
      }
      const qty = await inventoryService.getStockLevel(
        org.id,
        transferForm.product_id,
        transferForm.from_location_id
      )
      setAvailableQty(qty)
    }
    loadAvailable()
  }, [org?.id, transferForm.product_id, transferForm.from_location_id])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term && typeFilter === 'all') return rows
    return rows.filter((row) => {
      const matchesSearch = term
        ? Object.values(row).some((value) => String(value).toLowerCase().includes(term))
        : true
      const matchesType = typeFilter === 'all'
        ? true
        : String(row.type || '').toLowerCase() === typeFilter
      return matchesSearch && matchesType
    })
  }, [rows, search, typeFilter])

  const resetProductForm = () => {
    setProductForm({
      name: '',
      sku: '',
      type: 'stock',
      unit_id: '',
      category_id: '',
      track_inventory: true,
      is_active: true,
    })
    setEditingProduct(null)
  }

  const resetLocationForm = () => {
    setLocationForm({
      name: '',
      type: 'warehouse',
    })
    setEditingLocation(null)
  }

  const handleSaveProduct = async () => {
    if (!org?.id || !productForm.name.trim()) return
    if (editingProduct) {
      await inventoryService.updateProduct({
        id: editingProduct.id,
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || null,
        type: productForm.type,
        unit_id: productForm.unit_id || null,
        category_id: productForm.category_id || null,
        track_inventory: productForm.track_inventory,
        is_active: productForm.is_active,
      })
    } else {
      await inventoryService.createProduct({
        org_id: org.id,
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || null,
        type: productForm.type,
        unit_id: productForm.unit_id || null,
        category_id: productForm.category_id || null,
        track_inventory: productForm.track_inventory,
        is_active: productForm.is_active,
      })
    }
    setProductModalOpen(false)
    resetProductForm()
    setActiveTab('products')
    setRefreshKey((prev) => prev + 1)
  }

  const handleSaveLocation = async () => {
    if (!org?.id || !locationForm.name.trim()) return
    if (editingLocation) {
      await inventoryService.updateLocation({
        id: editingLocation.id,
        name: locationForm.name.trim(),
        type: locationForm.type,
      })
    } else {
      await inventoryService.createLocation({
        org_id: org.id,
        name: locationForm.name.trim(),
        type: locationForm.type,
      })
    }
    setLocationModalOpen(false)
    resetLocationForm()
    setActiveTab('locations')
    setRefreshKey((prev) => prev + 1)
  }

  const handleCreateTransfer = async () => {
    if (!org?.id) return
    if (!transferForm.product_id || !transferForm.from_location_id || !transferForm.to_location_id) return
    if (transferForm.from_location_id === transferForm.to_location_id) {
      setTransferError('From and To locations must be different.')
      return
    }
    if (availableQty !== null && transferForm.qty > availableQty) {
      setTransferError(`Insufficient stock. Available: ${availableQty}.`)
      return
    }
    if (transferForm.qty <= 0) {
      setTransferError('Quantity must be greater than 0.')
      return
    }

    await inventoryService.createTransfer({
      org_id: org.id,
      product_id: transferForm.product_id,
      from_location_id: transferForm.from_location_id,
      to_location_id: transferForm.to_location_id,
      qty: Number(transferForm.qty),
    })
    setTransferModalOpen(false)
    setTransferForm({
      product_id: '',
      from_location_id: '',
      to_location_id: '',
      qty: 1,
    })
    setTransferError(null)
    setAvailableQty(null)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Inventory"
          subtitle="Manage products, stock levels, and availability."
          actions={(
            <>
              {activeTab === 'products' && (
                <button
                  className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                  onClick={() => {
                    resetProductForm()
                    setProductModalOpen(true)
                  }}
                >
                  Add product
                </button>
              )}
              {activeTab === 'locations' && (
                <button
                  className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                  onClick={() => {
                    resetLocationForm()
                    setLocationModalOpen(true)
                  }}
                >
                  Add location
                </button>
              )}
              {activeTab === 'transfers' && (
                <button
                  className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                  onClick={() => {
                    setTransferError(null)
                    setTransferModalOpen(true)
                  }}
                >
                  Create transfer
                </button>
              )}
            </>
          )}
        />

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'products', label: 'Products' },
            { id: 'locations', label: 'Locations' },
            { id: 'stock', label: 'Stock Levels' },
            { id: 'transfers', label: 'Transfers' },
          ].map((tab) => (
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
          {activeTab === 'products' && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="all">All types</option>
              <option value="stock">Stock</option>
              <option value="serialized">Serialized</option>
              <option value="perishable">Perishable</option>
              <option value="rental_asset">Rental asset</option>
              <option value="service">Service</option>
            </select>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={filteredRows}
          loading={loading}
          emptyLabel={activeTab === 'products' ? 'No products yet.' : 'No records yet.'}
          defaultSortKey={activeTab === 'products' ? 'name' : undefined}
          enableSearch={false}
        />

        {activeTab === 'transfers' && selectedTransfer && (
          <div className="app-shell shadow rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900">
              Transfer Details
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Product</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedTransfer.product_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reference</p>
                <p className="text-sm font-medium text-gray-900">
                  {String(selectedTransfer.id).slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">From</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedTransfer.from_location || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">To</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedTransfer.to_location || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quantity</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedTransfer.qty}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(selectedTransfer.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={productModalOpen}
        title={editingProduct ? 'Edit product' : 'Add product'}
        onClose={() => setProductModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setProductModalOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProduct}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              Save
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">SKU</label>
            <input
              type="text"
              value={productForm.sku}
              onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={productForm.type}
                onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="stock">Stock</option>
                <option value="serialized">Serialized</option>
                <option value="perishable">Perishable</option>
                <option value="rental_asset">Rental asset</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <select
                value={productForm.unit_id}
                onChange={(e) => setProductForm({ ...productForm, unit_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">None</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}{unit.symbol ? ` (${unit.symbol})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={productForm.category_id}
                onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                  className="mr-2"
                />
                Active
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={locationModalOpen}
        title={editingLocation ? 'Edit location' : 'Add location'}
        onClose={() => setLocationModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setLocationModalOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveLocation}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              Save
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={locationForm.type}
              onChange={(e) => setLocationForm({ ...locationForm, type: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="warehouse">Warehouse</option>
              <option value="store">Store</option>
              <option value="truck">Truck</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={transferModalOpen}
        title="Create transfer"
        onClose={() => setTransferModalOpen(false)}
        footer={(
          <>
            <button
              onClick={() => setTransferModalOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTransfer}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              Create
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Product</label>
            <select
              value={transferForm.product_id}
              onChange={(e) => setTransferForm({ ...transferForm, product_id: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700">From</label>
              <select
                value={transferForm.from_location_id}
                onChange={(e) => setTransferForm({ ...transferForm, from_location_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              {availableQty !== null && (
                <p className="mt-1 text-xs text-gray-500">
                  Available: {availableQty}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">To</label>
              <select
                value={transferForm.to_location_id}
                onChange={(e) => setTransferForm({ ...transferForm, to_location_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              min="1"
              value={transferForm.qty}
              onChange={(e) => setTransferForm({ ...transferForm, qty: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          {transferError && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{transferError}</p>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
