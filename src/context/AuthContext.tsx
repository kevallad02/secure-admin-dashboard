import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../supabaseClient'
import { profileService, type Profile } from '../services/profileService'
import { orgService, type OrgSummary } from '../services/orgService'
import { applyBranding } from '../utils/branding'

interface AuthContextType {
  user: any | null
  session: any | null
  loading: boolean
  profile: Profile | null
  org: OrgSummary | null
  onboardingComplete: boolean
  isAdmin: boolean
  isOwner: boolean
  canManageTaxes: boolean
  refreshOrg: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [org, setOrg] = useState<OrgSummary | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const lastTokenRef = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth loading timed out; continuing without session.')
        setLoading(false)
      }
    }, 3000)

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

        try {
          const userOrg = await orgService.getPrimaryOrgForUser(nextSession.user.id)
          if (isMounted) {
            setOrg(userOrg)
            setOnboardingComplete(Boolean(userOrg?.onboarding_completed_at))
          }
        } catch (error) {
          console.error('Error loading org:', error)
          if (isMounted) {
            setOrg(null)
            setOnboardingComplete(false)
          }
        }
      } else if (isMounted) {
        setProfile(null)
        setOrg(null)
        setOnboardingComplete(false)
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(session)
    }).catch((error) => {
      console.error('Error fetching session:', error)
      if (isMounted) {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthState(nextSession)
    })

    return () => {
      isMounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    applyBranding(org?.brand_color ?? null)
  }, [org?.brand_color])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshOrg = async () => {
    if (!session?.user) return
    const userOrg = await orgService.getPrimaryOrgForUser(session.user.id)
    setOrg(userOrg)
    setOnboardingComplete(Boolean(userOrg?.onboarding_completed_at))
  }

  const value = {
    user,
    session,
    loading,
    profile,
    org,
    onboardingComplete,
    isAdmin: profile?.role === 'admin',
    isOwner: profile?.role === 'owner',
    canManageTaxes: profile?.role === 'admin' || profile?.role === 'owner',
    refreshOrg,
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
