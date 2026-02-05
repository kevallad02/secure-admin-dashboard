import { supabase } from '../supabaseClient'
import { activityLogService } from './activityLogService'

export interface OrgMember {
  org_id: string
  user_id: string
  role: string
  created_at: string
  profiles: {
    id: string
    email: string
  }[] | null
}

export const orgMembersService = {
  async findProfileByEmail(email: string): Promise<{ id: string; email: string } | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('Error finding profile by email:', error)
      return null
    }
    return data || null
  },

  async addMember(payload: { org_id: string; email: string; role: string }): Promise<{ success: boolean; message?: string }> {
    const profile = await this.findProfileByEmail(payload.email)
    if (!profile) {
      return { success: false, message: 'User not found. Ask them to sign up first.' }
    }

    const { error } = await supabase
      .from('org_members')
      .insert({
        org_id: payload.org_id,
        user_id: profile.id,
        role: payload.role,
      })

    if (error) {
      console.error('Error adding org member:', error)
      return { success: false, message: 'Could not add user. They may already be a member.' }
    }
    await activityLogService.createLog('Added org member')
    return { success: true }
  },

  async deleteMember(payload: { org_id: string; user_id: string }): Promise<boolean> {
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('org_id', payload.org_id)
      .eq('user_id', payload.user_id)

    if (error) {
      console.error('Error deleting org member:', error)
      return false
    }
    await activityLogService.createLog('Removed org member')
    return true
  },

  async getOrgMembersPaged(orgId: string, page: number, pageSize: number): Promise<{ data: OrgMember[]; count: number }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('org_members')
      .select('org_id, user_id, role, created_at, profiles ( id, email )', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching org members:', error)
      return { data: [], count: 0 }
    }
    return { data: data || [], count: count || 0 }
  },

  async getOrgMembers(orgId: string): Promise<OrgMember[]> {
    const { data, error } = await supabase
      .from('org_members')
      .select('org_id, user_id, role, created_at, profiles ( id, email )')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching org members:', error)
      return []
    }
    return data || []
  },

  async updateMemberRole(payload: { org_id: string; user_id: string; role: string }): Promise<boolean> {
    const { error } = await supabase
      .from('org_members')
      .update({ role: payload.role })
      .eq('org_id', payload.org_id)
      .eq('user_id', payload.user_id)

    if (error) {
      console.error('Error updating member role:', error)
      return false
    }
    await activityLogService.createLog('Updated org member role')
    return true
  },
}
