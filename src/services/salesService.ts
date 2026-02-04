import { supabase } from '../supabaseClient'
import { activityLogService } from './activityLogService'

export interface Customer {
  id: string
  name: string
  contact: any
  created_at: string
}

export interface SalesOrder {
  id: string
  customer_id: string | null
  status: string
  total: number
  created_at: string
}

export interface Invoice {
  id: string
  customer_id: string | null
  status: string
  total: number
  due_date: string | null
  created_at: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  product_id: string | null
  qty: number
  unit_price: number
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string | null
  amount: number
  method: string | null
  paid_at: string
  created_at: string
  notes?: string | null
}

export const salesService = {
  async getCustomers(orgId: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, contact, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
      return []
    }
    return data || []
  },

  async getSalesOrders(orgId: string): Promise<SalesOrder[]> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('id, customer_id, status, total, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sales orders:', error)
      return []
    }
    return data || []
  },

  async getInvoices(orgId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, customer_id, status, total, due_date, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invoices:', error)
      return []
    }
    return data || []
  },

  async getPayments(orgId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('id, invoice_id, amount, method, paid_at, created_at, notes')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      return []
    }
    return data || []
  },

  async getInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
    const { data, error } = await supabase
      .from('invoice_lines')
      .select('id, invoice_id, product_id, qty, unit_price, created_at')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching invoice lines:', error)
      return []
    }
    return data || []
  },

  async createCustomer(payload: { org_id: string; name: string; contact?: any }): Promise<boolean> {
    const { error } = await supabase
      .from('customers')
      .insert({
        org_id: payload.org_id,
        name: payload.name,
        contact: payload.contact || {},
      })
    if (error) {
      console.error('Error creating customer:', error)
      return false
    }
    await activityLogService.createLog(`Created customer "${payload.name}"`)
    return true
  },

  async updateCustomer(payload: { id: string; name: string; contact?: any }): Promise<boolean> {
    const { error } = await supabase
      .from('customers')
      .update({
        name: payload.name,
        contact: payload.contact || {},
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating customer:', error)
      return false
    }
    await activityLogService.createLog(`Updated customer "${payload.name}"`)
    return true
  },

  async createOrder(payload: { org_id: string; customer_id?: string | null; status: string; total: number }): Promise<boolean> {
    const { error } = await supabase
      .from('sales_orders')
      .insert({
        org_id: payload.org_id,
        customer_id: payload.customer_id || null,
        status: payload.status,
        total: payload.total,
      })
    if (error) {
      console.error('Error creating order:', error)
      return false
    }
    await activityLogService.createLog('Created sales order')
    return true
  },

  async updateOrder(payload: { id: string; customer_id?: string | null; status: string; total: number }): Promise<boolean> {
    const { error } = await supabase
      .from('sales_orders')
      .update({
        customer_id: payload.customer_id || null,
        status: payload.status,
        total: payload.total,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating order:', error)
      return false
    }
    await activityLogService.createLog('Updated sales order')
    return true
  },

  async createInvoice(payload: { org_id: string; customer_id?: string | null; status: string; total: number; due_date?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .insert({
        org_id: payload.org_id,
        customer_id: payload.customer_id || null,
        status: payload.status,
        total: payload.total,
        due_date: payload.due_date || null,
      })
    if (error) {
      console.error('Error creating invoice:', error)
      return false
    }
    await activityLogService.createLog('Created invoice')
    return true
  },

  async createInvoiceAndReturnId(payload: { org_id: string; customer_id?: string | null; status: string; total: number; due_date?: string | null }): Promise<string | null> {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        org_id: payload.org_id,
        customer_id: payload.customer_id || null,
        status: payload.status,
        total: payload.total,
        due_date: payload.due_date || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return null
    }
    await activityLogService.createLog('Created invoice')
    return data?.id || null
  },

  async updateInvoice(payload: { id: string; customer_id?: string | null; status: string; total: number; due_date?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .update({
        customer_id: payload.customer_id || null,
        status: payload.status,
        total: payload.total,
        due_date: payload.due_date || null,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating invoice:', error)
      return false
    }
    await activityLogService.createLog('Updated invoice')
    return true
  },

  async createPayment(payload: { org_id: string; invoice_id?: string | null; amount: number; method?: string | null; paid_at?: string | null; notes?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('payments')
      .insert({
        org_id: payload.org_id,
        invoice_id: payload.invoice_id || null,
        amount: payload.amount,
        method: payload.method || null,
        paid_at: payload.paid_at || new Date().toISOString(),
        notes: payload.notes || null,
      })
    if (error) {
      console.error('Error creating payment:', error)
      return false
    }
    await activityLogService.createLog('Created payment')
    return true
  },

  async updatePayment(payload: { id: string; invoice_id?: string | null; amount: number; method?: string | null; paid_at?: string | null; notes?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('payments')
      .update({
        invoice_id: payload.invoice_id || null,
        amount: payload.amount,
        method: payload.method || null,
        paid_at: payload.paid_at || new Date().toISOString(),
        notes: payload.notes || null,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating payment:', error)
      return false
    }
    await activityLogService.createLog('Updated payment')
    return true
  },

  async deletePayment(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting payment:', error)
      return false
    }
    await activityLogService.createLog('Deleted payment')
    return true
  },

  async createInvoiceLine(payload: { invoice_id: string; product_id?: string | null; qty: number; unit_price: number }): Promise<boolean> {
    const { error } = await supabase
      .from('invoice_lines')
      .insert({
        invoice_id: payload.invoice_id,
        product_id: payload.product_id || null,
        qty: payload.qty,
        unit_price: payload.unit_price,
      })
    if (error) {
      console.error('Error creating invoice line:', error)
      return false
    }
    await activityLogService.createLog('Created invoice line')
    return true
  },

  async updateInvoiceLine(payload: { id: string; product_id?: string | null; qty: number; unit_price: number }): Promise<boolean> {
    const { error } = await supabase
      .from('invoice_lines')
      .update({
        product_id: payload.product_id || null,
        qty: payload.qty,
        unit_price: payload.unit_price,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating invoice line:', error)
      return false
    }
    await activityLogService.createLog('Updated invoice line')
    return true
  },

  async deleteInvoiceLine(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoice_lines')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting invoice line:', error)
      return false
    }
    await activityLogService.createLog('Deleted invoice line')
    return true
  },

  async updateInvoiceTotal(invoiceId: string): Promise<boolean> {
    const { data: lines, error } = await supabase
      .from('invoice_lines')
      .select('qty, unit_price')
      .eq('invoice_id', invoiceId)

    if (error) {
      console.error('Error fetching invoice lines:', error)
      return false
    }

    const total = (lines || []).reduce((sum: number, line: any) => {
      return sum + Number(line.qty || 0) * Number(line.unit_price || 0)
    }, 0)

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ total })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice total:', updateError)
      return false
    }

    return true
  },
}
