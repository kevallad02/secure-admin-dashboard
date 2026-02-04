import { supabase } from '../supabaseClient'
import { activityLogService } from './activityLogService'

export interface Vendor {
  id: string
  name: string
  contact: any
  created_at: string
}

export interface PurchaseOrder {
  id: string
  vendor_id: string | null
  status: string
  total: number
  ordered_at: string | null
  created_at: string
}

export interface PurchaseReceipt {
  id: string
  po_id: string | null
  status: string
  total: number
  received_at: string
  created_at: string
}

export interface PurchaseOrderLine {
  id: string
  po_id: string
  product_id: string | null
  qty: number
  unit_cost: number
  created_at: string
}

export interface PurchaseOrderLineWithOrg extends PurchaseOrderLine {
  purchase_orders: {
    id: string
    org_id: string
  }[] | null
}

export interface PurchaseReceiptLine {
  id: string
  receipt_id: string
  product_id: string | null
  qty: number
  unit_cost: number
  created_at: string
}

export const purchaseService = {
  async getVendors(orgId: string): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, name, contact, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching vendors:', error)
      return []
    }
    return data || []
  },

  async getPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, vendor_id, status, total, ordered_at, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchase orders:', error)
      return []
    }
    return data || []
  },

  async getReceipts(orgId: string): Promise<PurchaseReceipt[]> {
    const { data, error } = await supabase
      .from('purchase_receipts')
      .select('id, po_id, status, total, received_at, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching receipts:', error)
      return []
    }
    return data || []
  },

  async getPurchaseOrderLines(poId: string): Promise<PurchaseOrderLine[]> {
    const { data, error } = await supabase
      .from('purchase_order_lines')
      .select('id, po_id, product_id, qty, unit_cost, created_at')
      .eq('po_id', poId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching PO lines:', error)
      return []
    }
    return data || []
  },

  async getPurchaseOrderLinesForOrg(orgId: string): Promise<PurchaseOrderLineWithOrg[]> {
    const { data, error } = await supabase
      .from('purchase_order_lines')
      .select('id, po_id, product_id, qty, unit_cost, created_at, purchase_orders ( id, org_id )')
      .eq('purchase_orders.org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching org PO lines:', error)
      return []
    }
    return data || []
  },

  async getReceiptLines(receiptId: string): Promise<PurchaseReceiptLine[]> {
    const { data, error } = await supabase
      .from('purchase_receipt_lines')
      .select('id, receipt_id, product_id, qty, unit_cost, created_at')
      .eq('receipt_id', receiptId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching receipt lines:', error)
      return []
    }
    return data || []
  },

  async createVendor(payload: { org_id: string; name: string; contact?: any }): Promise<boolean> {
    const { error } = await supabase
      .from('vendors')
      .insert({
        org_id: payload.org_id,
        name: payload.name,
        contact: payload.contact || {},
      })
    if (error) {
      console.error('Error creating vendor:', error)
      return false
    }
    await activityLogService.createLog(`Created vendor "${payload.name}"`)
    return true
  },

  async updateVendor(payload: { id: string; name: string; contact?: any }): Promise<boolean> {
    const { error } = await supabase
      .from('vendors')
      .update({
        name: payload.name,
        contact: payload.contact || {},
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating vendor:', error)
      return false
    }
    await activityLogService.createLog(`Updated vendor "${payload.name}"`)
    return true
  },

  async createPurchaseOrder(payload: { org_id: string; vendor_id?: string | null; status: string; total: number; ordered_at?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_orders')
      .insert({
        org_id: payload.org_id,
        vendor_id: payload.vendor_id || null,
        status: payload.status,
        total: payload.total,
        ordered_at: payload.ordered_at || null,
      })
    if (error) {
      console.error('Error creating purchase order:', error)
      return false
    }
    await activityLogService.createLog('Created purchase order')
    return true
  },

  async updatePurchaseOrder(payload: { id: string; vendor_id?: string | null; status: string; total: number; ordered_at?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        vendor_id: payload.vendor_id || null,
        status: payload.status,
        total: payload.total,
        ordered_at: payload.ordered_at || null,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating purchase order:', error)
      return false
    }
    await activityLogService.createLog('Updated purchase order')
    return true
  },

  async createReceipt(payload: { org_id: string; po_id?: string | null; status: string; total: number; received_at?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_receipts')
      .insert({
        org_id: payload.org_id,
        po_id: payload.po_id || null,
        status: payload.status,
        total: payload.total,
        received_at: payload.received_at || null,
      })
    if (error) {
      console.error('Error creating receipt:', error)
      return false
    }
    await activityLogService.createLog('Created purchase receipt')
    return true
  },

  async updateReceipt(payload: { id: string; po_id?: string | null; status: string; total: number; received_at?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_receipts')
      .update({
        po_id: payload.po_id || null,
        status: payload.status,
        total: payload.total,
        received_at: payload.received_at || null,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating receipt:', error)
      return false
    }
    await activityLogService.createLog('Updated purchase receipt')
    return true
  },

  async createPurchaseOrderLine(payload: { po_id: string; product_id?: string | null; qty: number; unit_cost: number }): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_order_lines')
      .insert({
        po_id: payload.po_id,
        product_id: payload.product_id || null,
        qty: payload.qty,
        unit_cost: payload.unit_cost,
      })
    if (error) {
      console.error('Error creating PO line:', error)
      return false
    }
    await activityLogService.createLog('Created purchase order line')
    return true
  },

  async updatePurchaseOrderLine(payload: { id: string; product_id?: string | null; qty: number; unit_cost: number }): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_order_lines')
      .update({
        product_id: payload.product_id || null,
        qty: payload.qty,
        unit_cost: payload.unit_cost,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating PO line:', error)
      return false
    }
    await activityLogService.createLog('Updated purchase order line')
    return true
  },

  async deletePurchaseOrderLine(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_order_lines')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting PO line:', error)
      return false
    }
    await activityLogService.createLog('Deleted purchase order line')
    return true
  },

  async createReceiptLine(payload: { receipt_id: string; product_id?: string | null; qty: number; unit_cost: number }): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_receipt_lines')
      .insert({
        receipt_id: payload.receipt_id,
        product_id: payload.product_id || null,
        qty: payload.qty,
        unit_cost: payload.unit_cost,
      })
    if (error) {
      console.error('Error creating receipt line:', error)
      return false
    }
    await activityLogService.createLog('Created purchase receipt line')
    return true
  },

  async updateReceiptLine(payload: { id: string; product_id?: string | null; qty: number; unit_cost: number }): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_receipt_lines')
      .update({
        product_id: payload.product_id || null,
        qty: payload.qty,
        unit_cost: payload.unit_cost,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating receipt line:', error)
      return false
    }
    await activityLogService.createLog('Updated purchase receipt line')
    return true
  },

  async deleteReceiptLine(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_receipt_lines')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting receipt line:', error)
      return false
    }
    await activityLogService.createLog('Deleted purchase receipt line')
    return true
  },

  async createReceiptFromPO(payload: { org_id: string; po_id: string; received_at?: string | null }): Promise<boolean> {
    const { org_id, po_id, received_at } = payload

    const { data: poLines, error: poError } = await supabase
      .from('purchase_order_lines')
      .select('product_id, qty, unit_cost')
      .eq('po_id', po_id)

    if (poError) {
      console.error('Error fetching PO lines:', poError)
      return false
    }

    const total = (poLines || []).reduce((sum: number, line: any) => {
      return sum + Number(line.qty || 0) * Number(line.unit_cost || 0)
    }, 0)

    const { data: receipt, error: receiptError } = await supabase
      .from('purchase_receipts')
      .insert({
        org_id,
        po_id,
        status: 'received',
        total,
        received_at: received_at || new Date().toISOString(),
      })
      .select('id')
      .single()

    if (receiptError || !receipt?.id) {
      console.error('Error creating receipt:', receiptError)
      return false
    }

    const receiptId = receipt.id

    if (poLines && poLines.length > 0) {
      const { error: lineError } = await supabase
        .from('purchase_receipt_lines')
        .insert(poLines.map((line: any) => ({
          receipt_id: receiptId,
          product_id: line.product_id || null,
          qty: line.qty,
          unit_cost: line.unit_cost,
        })))

      if (lineError) {
        console.error('Error creating receipt lines:', lineError)
        return false
      }
    }

    // Ensure a location exists for stock sync
    const { data: location } = await supabase
      .from('locations')
      .select('id')
      .eq('org_id', org_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let locationId = location?.id || null
    if (!locationId) {
      const { data: createdLocation, error: locationError } = await supabase
        .from('locations')
        .insert({
          org_id,
          name: 'Main Warehouse',
          type: 'warehouse',
        })
        .select('id')
        .single()
      if (!locationError) {
        locationId = createdLocation?.id || null
      }
    }

    if (locationId && poLines && poLines.length > 0) {
      for (const line of poLines) {
        if (!line.product_id) continue
        const { data: level } = await supabase
          .from('stock_levels')
          .select('qty_on_hand, qty_reserved')
          .eq('org_id', org_id)
          .eq('product_id', line.product_id)
          .eq('location_id', locationId)
          .is('variant_id', null)
          .maybeSingle()

        const nextQty = Number(level?.qty_on_hand || 0) + Number(line.qty || 0)
        const reserved = Number(level?.qty_reserved || 0)

        await supabase
          .from('stock_levels')
          .upsert({
            org_id,
            product_id: line.product_id,
            location_id: locationId,
            variant_id: null,
            qty_on_hand: nextQty,
            qty_reserved: reserved,
          }, { onConflict: 'org_id,product_id,location_id,variant_id' })

        await supabase
          .from('stock_movements')
          .insert({
            org_id,
            product_id: line.product_id,
            location_id: locationId,
            qty: Number(line.qty || 0),
            type: 'receipt',
            ref_type: 'purchase_receipt',
            ref_id: receiptId,
          })
      }
    }

    return true
  },

  async updatePurchaseOrderTotal(poId: string): Promise<boolean> {
    const { data: lines, error } = await supabase
      .from('purchase_order_lines')
      .select('qty, unit_cost')
      .eq('po_id', poId)

    if (error) {
      console.error('Error fetching PO lines:', error)
      return false
    }

    const total = (lines || []).reduce((sum: number, line: any) => {
      return sum + Number(line.qty || 0) * Number(line.unit_cost || 0)
    }, 0)

    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({ total })
      .eq('id', poId)

    if (updateError) {
      console.error('Error updating PO total:', updateError)
      return false
    }
    return true
  },

  async updateReceiptTotal(receiptId: string): Promise<boolean> {
    const { data: lines, error } = await supabase
      .from('purchase_receipt_lines')
      .select('qty, unit_cost')
      .eq('receipt_id', receiptId)

    if (error) {
      console.error('Error fetching receipt lines:', error)
      return false
    }

    const total = (lines || []).reduce((sum: number, line: any) => {
      return sum + Number(line.qty || 0) * Number(line.unit_cost || 0)
    }, 0)

    const { error: updateError } = await supabase
      .from('purchase_receipts')
      .update({ total })
      .eq('id', receiptId)

    if (updateError) {
      console.error('Error updating receipt total:', updateError)
      return false
    }
    return true
  },
}
