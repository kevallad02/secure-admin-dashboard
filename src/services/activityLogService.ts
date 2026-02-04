import { supabase } from '../supabaseClient'

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  ip_address: string
  created_at: string
}

export const activityLogService = {
  async getLogsPaged(page: number, pageSize: number): Promise<{ data: ActivityLog[]; count: number }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching logs:', error)
      return { data: [], count: 0 }
    }

    return { data: data || [], count: count || 0 }
  },
  // Get all activity logs (admin only)
  async getAllLogs(): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching logs:', error)
      return []
    }

    return data || []
  },

  // Create activity log
  async createLog(action: string, ipAddress?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action,
        ip_address: ipAddress || 'unknown',
      })

    if (error) {
      console.error('Error creating log:', error)
    }
  },
}
