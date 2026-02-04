import { supabase } from '../supabaseClient'

export interface OrgSummary {
  id: string
  name: string
  onboarding_completed_at: string | null
}

export interface OrgSettings {
  org_id: string
  currency_code: string
  tax_rate: number
  tax_included: boolean
  country_code?: string | null
}

export const orgService = {
  async getPrimaryOrgForUser(userId: string): Promise<OrgSummary | null> {
    const { data, error } = await supabase
      .from('org_members')
      .select('org_id, organizations ( id, name, onboarding_completed_at )')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error || !data?.organizations) {
      if (error) {
        console.error('Error fetching primary org:', error)
      }
      return null
    }

    const org = Array.isArray(data.organizations) ? data.organizations[0] : data.organizations
    return org ? {
      id: org.id,
      name: org.name,
      onboarding_completed_at: org.onboarding_completed_at ?? null,
    } : null
  },

  async upsertOrgSettings(settings: OrgSettings): Promise<boolean> {
    const { error } = await supabase
      .from('org_settings')
      .upsert({
        org_id: settings.org_id,
        currency_code: settings.currency_code,
        tax_rate: settings.tax_rate,
        tax_included: settings.tax_included,
        country_code: settings.country_code || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'org_id' })

    if (error) {
      console.error('Error saving org settings:', error)
      return false
    }
    return true
  },

  async markOnboardingComplete(orgId: string): Promise<boolean> {
    const { error } = await supabase
      .from('organizations')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', orgId)

    if (error) {
      console.error('Error marking onboarding complete:', error)
      return false
    }
    return true
  },

  async getDefaultUnits(orgId: string): Promise<{ id: string, name: string, symbol: string | null }[]> {
    const { data, error } = await supabase
      .from('units')
      .select('id, name, symbol')
      .eq('org_id', orgId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching units:', error)
      return []
    }
    return data || []
  },

  async getDefaultCategories(orgId: string): Promise<{ id: string, name: string }[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('org_id', orgId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }
    return data || []
  },

  async createFirstProduct(payload: {
    org_id: string
    name: string
    sku?: string
    type: string
    unit_id?: string | null
    category_id?: string | null
    track_inventory: boolean
  }): Promise<string | null> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        org_id: payload.org_id,
        name: payload.name,
        sku: payload.sku || null,
        type: payload.type,
        unit_id: payload.unit_id || null,
        category_id: payload.category_id || null,
        track_inventory: payload.track_inventory,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating first product:', error)
      return null
    }
    return data?.id || null
  },

  async createLocation(orgId: string, name: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('locations')
      .insert({
        org_id: orgId,
        name,
        type: 'warehouse',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating location:', error)
      return null
    }
    return data?.id || null
  },

  async setInitialStock(payload: {
    org_id: string
    product_id: string
    location_id: string
    qty_on_hand: number
  }): Promise<boolean> {
    const { error } = await supabase
      .from('stock_levels')
      .insert({
        org_id: payload.org_id,
        product_id: payload.product_id,
        location_id: payload.location_id,
        variant_id: null,
        qty_on_hand: payload.qty_on_hand,
        qty_reserved: 0,
      })

    if (error) {
      console.error('Error setting initial stock:', error)
      return false
    }
    return true
  },

  async getTaxTemplates(): Promise<{ id: string, country_code: string, name: string, rate: number, tax_included: boolean }[]> {
    const { data, error } = await supabase
      .from('org_tax_templates')
      .select('id, country_code, name, rate, tax_included')
      .order('country_code', { ascending: true })

    if (error) {
      console.error('Error fetching tax templates:', error)
      return []
    }
    return data || []
  },

  async createTaxTemplate(payload: {
    country_code: string
    name: string
    rate: number
    tax_included: boolean
    is_default?: boolean
  }): Promise<boolean> {
    const { error } = await supabase
      .from('org_tax_templates')
      .insert({
        country_code: payload.country_code,
        name: payload.name,
        rate: payload.rate,
        tax_included: payload.tax_included,
        is_default: payload.is_default || false,
      })

    if (error) {
      console.error('Error creating tax template:', error)
      return false
    }
    return true
  },

  async updateTaxTemplate(payload: {
    id: string
    country_code: string
    name: string
    rate: number
    tax_included: boolean
    is_default?: boolean
  }): Promise<boolean> {
    const { error } = await supabase
      .from('org_tax_templates')
      .update({
        country_code: payload.country_code,
        name: payload.name,
        rate: payload.rate,
        tax_included: payload.tax_included,
        is_default: payload.is_default || false,
      })
      .eq('id', payload.id)

    if (error) {
      console.error('Error updating tax template:', error)
      return false
    }
    return true
  },

  async deleteTaxTemplate(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('org_tax_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting tax template:', error)
      return false
    }
    return true
  },
}
