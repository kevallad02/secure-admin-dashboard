import { supabase } from '../supabaseClient'
import { activityLogService } from './activityLogService'

export interface CustomField {
  id: string
  org_id: string
  entity: string
  name: string
  field_type: string
  required: boolean
  options: any
  created_at: string
}

export const customFieldsService = {
  async getCustomFields(orgId: string): Promise<CustomField[]> {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('id, org_id, entity, name, field_type, required, options, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching custom fields:', error)
      return []
    }
    return data || []
  },

  async createCustomField(payload: {
    org_id: string
    entity: string
    name: string
    field_type: string
    required: boolean
    options?: any
  }): Promise<boolean> {
    const { error } = await supabase
      .from('custom_fields')
      .insert({
        org_id: payload.org_id,
        entity: payload.entity,
        name: payload.name,
        field_type: payload.field_type,
        required: payload.required,
        options: payload.options || {},
      })

    if (error) {
      console.error('Error creating custom field:', error)
      return false
    }
    await activityLogService.createLog(`Created custom field "${payload.name}"`)
    return true
  },

  async updateCustomField(payload: {
    id: string
    entity: string
    name: string
    field_type: string
    required: boolean
    options?: any
  }): Promise<boolean> {
    const { error } = await supabase
      .from('custom_fields')
      .update({
        entity: payload.entity,
        name: payload.name,
        field_type: payload.field_type,
        required: payload.required,
        options: payload.options || {},
      })
      .eq('id', payload.id)

    if (error) {
      console.error('Error updating custom field:', error)
      return false
    }
    await activityLogService.createLog(`Updated custom field "${payload.name}"`)
    return true
  },

  async deleteCustomField(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting custom field:', error)
      return false
    }
    await activityLogService.createLog('Deleted custom field')
    return true
  },
}
