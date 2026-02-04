import { supabase } from '../supabaseClient'
import { activityLogService } from './activityLogService'

export interface InventoryProduct {
  id: string
  name: string
  sku: string | null
  type: string
  is_active: boolean
  unit_id: string | null
  category_id: string | null
}

export interface InventoryLocation {
  id: string
  name: string
  type: string | null
}

export interface InventoryStockLevel {
  id: string
  product_id: string
  location_id: string
  product_name: string
  location_name: string
  qty_on_hand: number
  qty_reserved: number
}

export interface InventoryMovement {
  id: string
  product_name: string | null
  qty: number
  type: string
  location_name: string | null
  created_at: string
}

export interface InventoryTransfer {
  id: string
  product_name: string | null
  from_location: string | null
  to_location: string | null
  qty: number
  created_at: string
}

export const inventoryService = {
  async getProducts(orgId: string): Promise<InventoryProduct[]> {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, type, is_active, unit_id, category_id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      return []
    }
    return data || []
  },

  async createProduct(payload: {
    org_id: string
    name: string
    sku?: string | null
    type: string
    unit_id?: string | null
    category_id?: string | null
    track_inventory: boolean
    is_active: boolean
  }): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .insert({
        org_id: payload.org_id,
        name: payload.name,
        sku: payload.sku || null,
        type: payload.type,
        unit_id: payload.unit_id || null,
        category_id: payload.category_id || null,
        track_inventory: payload.track_inventory,
        is_active: payload.is_active,
      })

    if (error) {
      console.error('Error creating product:', error)
      return false
    }
    await activityLogService.createLog(`Created product "${payload.name}"`)
    return true
  },

  async updateProduct(payload: {
    id: string
    name: string
    sku?: string | null
    type: string
    unit_id?: string | null
    category_id?: string | null
    track_inventory: boolean
    is_active: boolean
  }): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .update({
        name: payload.name,
        sku: payload.sku || null,
        type: payload.type,
        unit_id: payload.unit_id || null,
        category_id: payload.category_id || null,
        track_inventory: payload.track_inventory,
        is_active: payload.is_active,
      })
      .eq('id', payload.id)

    if (error) {
      console.error('Error updating product:', error)
      return false
    }
    await activityLogService.createLog(`Updated product "${payload.name}"`)
    return true
  },

  async getLocations(orgId: string): Promise<InventoryLocation[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, type')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching locations:', error)
      return []
    }
    return data || []
  },

  async createLocation(payload: { org_id: string; name: string; type: string }): Promise<boolean> {
    const { error } = await supabase
      .from('locations')
      .insert({
        org_id: payload.org_id,
        name: payload.name,
        type: payload.type,
      })

    if (error) {
      console.error('Error creating location:', error)
      return false
    }
    await activityLogService.createLog(`Created location "${payload.name}"`)
    return true
  },

  async updateLocation(payload: { id: string; name: string; type: string }): Promise<boolean> {
    const { error } = await supabase
      .from('locations')
      .update({
        name: payload.name,
        type: payload.type,
      })
      .eq('id', payload.id)

    if (error) {
      console.error('Error updating location:', error)
      return false
    }
    await activityLogService.createLog(`Updated location "${payload.name}"`)
    return true
  },

  async getStockLevels(orgId: string): Promise<InventoryStockLevel[]> {
    const { data, error } = await supabase
      .from('stock_levels')
      .select('product_id, location_id, qty_on_hand, qty_reserved, products ( name ), locations ( name )')
      .eq('org_id', orgId)

    if (error) {
      console.error('Error fetching stock levels:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: `${row.product_id}-${row.location_id}`,
      product_id: row.product_id,
      location_id: row.location_id,
      product_name: row.products?.name || 'Unknown',
      location_name: row.locations?.name || 'Unknown',
      qty_on_hand: Number(row.qty_on_hand || 0),
      qty_reserved: Number(row.qty_reserved || 0),
    }))
  },

  async getStockLevel(orgId: string, productId: string, locationId: string): Promise<number> {
    const { data, error } = await supabase
      .from('stock_levels')
      .select('qty_on_hand')
      .eq('org_id', orgId)
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .is('variant_id', null)
      .maybeSingle()

    if (error) {
      console.error('Error fetching stock level:', error)
      return 0
    }
    return Number(data?.qty_on_hand || 0)
  },

  async getMovements(orgId: string, type?: string): Promise<InventoryMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select('id, qty, type, created_at, products ( name ), locations ( name )')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching stock movements:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      product_name: row.products?.name || null,
      qty: Number(row.qty || 0),
      type: row.type,
      location_name: row.locations?.name || null,
      created_at: row.created_at,
    }))
  },

  async getTransfers(orgId: string): Promise<InventoryTransfer[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('id, qty, created_at, ref_id, products ( name ), locations ( name )')
      .eq('org_id', orgId)
      .eq('type', 'transfer')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transfers:', error)
      return []
    }

    const grouped: Record<string, InventoryTransfer> = {}
    ;(data || []).forEach((row: any) => {
      const refId = row.ref_id || row.id
      const existing = grouped[refId]
      const qty = Math.abs(Number(row.qty || 0))
      if (!existing) {
        grouped[refId] = {
          id: refId,
          product_name: row.products?.name || null,
          from_location: row.qty < 0 ? row.locations?.name || null : null,
          to_location: row.qty > 0 ? row.locations?.name || null : null,
          qty,
          created_at: row.created_at,
        }
      } else {
        if (row.qty < 0) {
          existing.from_location = row.locations?.name || null
        } else if (row.qty > 0) {
          existing.to_location = row.locations?.name || null
        }
      }
    })

    return Object.values(grouped)
  },

  async createTransfer(payload: {
    org_id: string
    product_id: string
    from_location_id: string
    to_location_id: string
    qty: number
  }): Promise<boolean> {
    const { org_id, product_id, from_location_id, to_location_id, qty } = payload
    const transferId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : null

    const { data: fromLevel } = await supabase
      .from('stock_levels')
      .select('qty_on_hand, qty_reserved')
      .eq('org_id', org_id)
      .eq('product_id', product_id)
      .eq('location_id', from_location_id)
      .is('variant_id', null)
      .maybeSingle()

    const { data: toLevel } = await supabase
      .from('stock_levels')
      .select('qty_on_hand, qty_reserved')
      .eq('org_id', org_id)
      .eq('product_id', product_id)
      .eq('location_id', to_location_id)
      .is('variant_id', null)
      .maybeSingle()

    const fromQty = Number(fromLevel?.qty_on_hand || 0) - qty
    const toQty = Number(toLevel?.qty_on_hand || 0) + qty
    const fromReserved = Number(fromLevel?.qty_reserved || 0)
    const toReserved = Number(toLevel?.qty_reserved || 0)

    if (fromQty < 0) {
      console.error('Insufficient stock for transfer')
      return false
    }

    const { error: upsertFrom } = await supabase
      .from('stock_levels')
      .upsert({
        org_id,
        product_id,
        location_id: from_location_id,
        variant_id: null,
        qty_on_hand: fromQty,
        qty_reserved: fromReserved,
      }, { onConflict: 'org_id,product_id,location_id,variant_id' })

    if (upsertFrom) {
      console.error('Error updating source stock:', upsertFrom)
      return false
    }

    const { error: upsertTo } = await supabase
      .from('stock_levels')
      .upsert({
        org_id,
        product_id,
        location_id: to_location_id,
        variant_id: null,
        qty_on_hand: toQty,
        qty_reserved: toReserved,
      }, { onConflict: 'org_id,product_id,location_id,variant_id' })

    if (upsertTo) {
      console.error('Error updating destination stock:', upsertTo)
      return false
    }

    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert([
        {
          org_id,
          product_id,
          location_id: from_location_id,
          qty: -Math.abs(qty),
          type: 'transfer',
          ref_type: 'transfer',
          ref_id: transferId,
        },
        {
          org_id,
          product_id,
          location_id: to_location_id,
          qty: Math.abs(qty),
          type: 'transfer',
          ref_type: 'transfer',
          ref_id: transferId,
        },
      ])

    if (movementError) {
      console.error('Error creating transfer movements:', movementError)
      return false
    }

    await activityLogService.createLog('Created stock transfer')
    return true
  },
}
