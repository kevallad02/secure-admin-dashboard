import { supabase } from '../supabaseClient'

export interface ActivityLog {
  id: string
  user_id: string
  org_id: string | null
  action: string
  ip_address: string
  created_at: string
  profiles: {
    id: string
    email: string
  }[] | null
}

export const activityLogService = {
  async getLogsPaged(orgId: string, page: number, pageSize: number): Promise<{ data: ActivityLog[]; count: number }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('activity_logs')
      .select('id, user_id, org_id, action, ip_address, created_at, profiles ( id, email )', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching logs:', error)
      return { data: [], count: 0 }
    }

    return { data: data || [], count: count || 0 }
  },
  // Get all activity logs (admin only)
  async getAllLogs(orgId: string): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, user_id, org_id, action, ip_address, created_at, profiles ( id, email )')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching logs:', error)
      return []
    }

    return data || []
  },

  // Create activity log
  async createLog(action: string, ipAddress?: string, orgId?: string | null): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined

      const { error } = await supabase.functions.invoke('log_activity', {
        body: {
          action,
          org_id: orgId || null,
          ip_address: ipAddress || null,
        },
        headers,
      })

      if (error) {
        console.error('Error creating log via function:', error)
      }
    } catch (error) {
      console.error('Error invoking log_activity:', error)
    }
  },
}
