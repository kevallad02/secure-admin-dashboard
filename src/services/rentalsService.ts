import { supabase } from '../supabaseClient'
import { activityLogService } from './activityLogService'

export interface Asset {
  id: string
  product_id: string | null
  serial: string | null
  status: string
  condition: string | null
  created_at: string
}

export interface RentalContract {
  id: string
  customer_id: string | null
  start_date: string
  end_date: string | null
  billing_cycle: string
  total: number
  created_at: string
}

export interface RentalEvent {
  id: string
  contract_id: string | null
  asset_id: string | null
  event_type: string
  event_date: string
  notes: string | null
}

export interface RentalCharge {
  id: string
  contract_id: string
  asset_id: string | null
  amount: number
  status: string
  due_date: string | null
  paid_at: string | null
  created_at: string
}

export interface RentalLine {
  id: string
  contract_id: string
  asset_id: string | null
  rate: number
  frequency: string
  next_charge_date: string | null
  created_at: string
}

export interface RentalScheduleLine {
  id: string
  contract_id: string
  asset_id: string | null
  rate: number
  frequency: string
  next_charge_date: string | null
  created_at: string
  rental_contracts: {
    id: string
    org_id: string
    customer_id: string | null
    billing_cycle: string
    start_date: string
    end_date: string | null
  }[] | null
}

export const rentalsService = {
  async getAssets(orgId: string): Promise<Asset[]> {
    const { data, error } = await supabase
      .from('assets')
      .select('id, product_id, serial, status, condition, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assets:', error)
      return []
    }
    return data || []
  },

  async getContracts(orgId: string): Promise<RentalContract[]> {
    const { data, error } = await supabase
      .from('rental_contracts')
      .select('id, customer_id, start_date, end_date, billing_cycle, total, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rental contracts:', error)
      return []
    }
    return data || []
  },

  async getEvents(orgId: string): Promise<RentalEvent[]> {
    const { data, error } = await supabase
      .from('rental_events')
      .select('id, contract_id, asset_id, event_type, event_date, notes')
      .eq('org_id', orgId)
      .order('event_date', { ascending: false })

    if (error) {
      console.error('Error fetching rental events:', error)
      return []
    }
    return data || []
  },

  async getCharges(orgId: string): Promise<RentalCharge[]> {
    const { data, error } = await supabase
      .from('rental_charges')
      .select('id, contract_id, asset_id, amount, status, due_date, paid_at, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rental charges:', error)
      return []
    }
    return data || []
  },

  async getLines(contractId: string): Promise<RentalLine[]> {
    const { data, error } = await supabase
      .from('rental_lines')
      .select('id, contract_id, asset_id, rate, frequency, next_charge_date, created_at')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching rental lines:', error)
      return []
    }
    return data || []
  },

  async getRecurringSchedules(orgId: string): Promise<RentalScheduleLine[]> {
    const { data, error } = await supabase
      .from('rental_lines')
      .select('id, contract_id, asset_id, rate, frequency, next_charge_date, created_at, rental_contracts ( id, org_id, customer_id, billing_cycle, start_date, end_date )')
      .eq('rental_contracts.org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rental schedules:', error)
      return []
    }
    return data || []
  },

  async createAsset(payload: { org_id: string; product_id?: string | null; serial?: string | null; status: string; condition?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('assets')
      .insert({
        org_id: payload.org_id,
        product_id: payload.product_id || null,
        serial: payload.serial || null,
        status: payload.status,
        condition: payload.condition || null,
      })
    if (error) {
      console.error('Error creating asset:', error)
      return false
    }
    await activityLogService.createLog('Created rental asset')
    return true
  },

  async updateAsset(payload: { id: string; product_id?: string | null; serial?: string | null; status: string; condition?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('assets')
      .update({
        product_id: payload.product_id || null,
        serial: payload.serial || null,
        status: payload.status,
        condition: payload.condition || null,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating asset:', error)
      return false
    }
    await activityLogService.createLog('Updated rental asset')
    return true
  },

  async createContract(payload: { org_id: string; customer_id?: string | null; start_date: string; end_date?: string | null; billing_cycle: string; total: number }): Promise<boolean> {
    const { error } = await supabase
      .from('rental_contracts')
      .insert({
        org_id: payload.org_id,
        customer_id: payload.customer_id || null,
        start_date: payload.start_date,
        end_date: payload.end_date || null,
        billing_cycle: payload.billing_cycle,
        total: payload.total,
      })
    if (error) {
      console.error('Error creating contract:', error)
      return false
    }
    await activityLogService.createLog('Created rental contract')
    return true
  },

  async updateContract(payload: { id: string; customer_id?: string | null; start_date: string; end_date?: string | null; billing_cycle: string; total: number }): Promise<boolean> {
    const { error } = await supabase
      .from('rental_contracts')
      .update({
        customer_id: payload.customer_id || null,
        start_date: payload.start_date,
        end_date: payload.end_date || null,
        billing_cycle: payload.billing_cycle,
        total: payload.total,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating contract:', error)
      return false
    }
    await activityLogService.createLog('Updated rental contract')
    return true
  },

  async createEvent(payload: { org_id: string; contract_id?: string | null; asset_id?: string | null; event_type: string; event_date?: string | null; notes?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('rental_events')
      .insert({
        org_id: payload.org_id,
        contract_id: payload.contract_id || null,
        asset_id: payload.asset_id || null,
        event_type: payload.event_type,
        event_date: payload.event_date || new Date().toISOString(),
        notes: payload.notes || null,
      })
    if (error) {
      console.error('Error creating rental event:', error)
      return false
    }
    await activityLogService.createLog('Created rental event')
    return true
  },

  async updateAssetStatus(assetId: string, status: string): Promise<boolean> {
    const { error } = await supabase
      .from('assets')
      .update({ status })
      .eq('id', assetId)
    if (error) {
      console.error('Error updating asset status:', error)
      return false
    }
    await activityLogService.createLog('Updated rental asset status')
    return true
  },

  async createCharge(payload: { org_id: string; contract_id: string; asset_id?: string | null; amount: number; status: string; due_date?: string | null; paid_at?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('rental_charges')
      .insert({
        org_id: payload.org_id,
        contract_id: payload.contract_id,
        asset_id: payload.asset_id || null,
        amount: payload.amount,
        status: payload.status,
        due_date: payload.due_date || null,
        paid_at: payload.paid_at || null,
      })
    if (error) {
      console.error('Error creating charge:', error)
      return false
    }
    await activityLogService.createLog('Created rental charge')
    return true
  },

  async updateCharge(payload: { id: string; status: string; paid_at?: string | null }): Promise<boolean> {
    const { error } = await supabase
      .from('rental_charges')
      .update({
        status: payload.status,
        paid_at: payload.paid_at || null,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating charge:', error)
      return false
    }
    await activityLogService.createLog('Updated rental charge')
    return true
  },

  async createLine(payload: { contract_id: string; asset_id?: string | null; rate: number; frequency: string }): Promise<boolean> {
    const { error } = await supabase
      .from('rental_lines')
      .insert({
        contract_id: payload.contract_id,
        asset_id: payload.asset_id || null,
        rate: payload.rate,
        frequency: payload.frequency,
      })
    if (error) {
      console.error('Error creating rental line:', error)
      return false
    }
    await activityLogService.createLog('Created rental line item')
    return true
  },

  async updateLine(payload: { id: string; asset_id?: string | null; rate: number; frequency: string }): Promise<boolean> {
    const { error } = await supabase
      .from('rental_lines')
      .update({
        asset_id: payload.asset_id || null,
        rate: payload.rate,
        frequency: payload.frequency,
      })
      .eq('id', payload.id)
    if (error) {
      console.error('Error updating rental line:', error)
      return false
    }
    await activityLogService.createLog('Updated rental line item')
    return true
  },

  async deleteLine(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('rental_lines')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting rental line:', error)
      return false
    }
    await activityLogService.createLog('Deleted rental line item')
    return true
  },

  async updateContractTotal(contractId: string): Promise<boolean> {
    const { data: lines, error } = await supabase
      .from('rental_lines')
      .select('rate')
      .eq('contract_id', contractId)

    if (error) {
      console.error('Error fetching rental lines:', error)
      return false
    }

    const total = (lines || []).reduce((sum: number, line: any) => sum + Number(line.rate || 0), 0)
    const { error: updateError } = await supabase
      .from('rental_contracts')
      .update({ total })
      .eq('id', contractId)

    if (updateError) {
      console.error('Error updating contract total:', updateError)
      return false
    }
    return true
  },

  async generateCharges(orgId: string): Promise<boolean> {
    const { error } = await supabase
      .rpc('generate_rental_charges', { target_org: orgId })
    if (error) {
      console.error('Error generating charges:', error)
      return false
    }
    return true
  },
}
