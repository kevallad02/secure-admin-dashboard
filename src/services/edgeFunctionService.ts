import { supabase } from '../supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  recentActivity: number
}

export const edgeFunctionService = {
  // Call edge function with authentication
  async callFunction<T>(functionName: string): Promise<T | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Function call failed')
      }

      return await response.json()
    } catch (error) {
      console.error(`Error calling function ${functionName}:`, error)
      return null
    }
  },

  // Get dashboard stats
  async getDashboardStats(): Promise<DashboardStats | null> {
    return this.callFunction<DashboardStats>('get_dashboard_stats')
  },
}
