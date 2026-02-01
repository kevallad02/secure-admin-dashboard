import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../supabaseClient'
import { profileService, type Profile } from '../services/profileService'

interface AuthContextType {
  user: any | null
  session: any | null
  loading: boolean
  profile: Profile | null
  isAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const lastTokenRef = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const setAuthState = async (nextSession: any | null) => {
      const nextToken = nextSession?.access_token ?? null
      if (lastTokenRef.current === nextToken) {
        return
      }
      lastTokenRef.current = nextToken
      if (!isMounted) return

      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (nextSession?.user) {
        try {
          const userProfile = await profileService.getCurrentProfile()
          if (isMounted) {
            setProfile(userProfile)
          }
        } catch (error) {
          console.error('Error loading profile:', error)
          if (isMounted) {
            setProfile(null)
          }
        }
      } else if (isMounted) {
        setProfile(null)
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthState(nextSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    profile,
    isAdmin: profile?.role === 'admin',
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
