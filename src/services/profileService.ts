import { supabase } from '../supabaseClient'

export interface Profile {
  id: string
  email: string
  role: 'user' | 'admin' | 'moderator' | 'owner'
  is_active: boolean
  created_at: string
}

export const profileService = {
  async getProfilesPaged(page: number, pageSize: number): Promise<{ data: Profile[]; count: number }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching profiles:', error)
      return { data: [], count: 0 }
    }

    return { data: data || [], count: count || 0 }
  },
  // Get current user's profile
  async getCurrentProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  },

  // Get all profiles (admin only)
  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching profiles:', error)
      return []
    }

    return data || []
  },

  // Update profile role (admin only)
  async updateRole(userId: string, role: string): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (error) {
      console.error('Error updating role:', error)
      return false
    }

    return true
  },

  // Check if user is admin
  async isAdmin(): Promise<boolean> {
    const profile = await this.getCurrentProfile()
    return profile?.role === 'admin'
  },
}
