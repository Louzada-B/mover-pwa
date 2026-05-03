import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../services/supabase'
import { authService } from '../services/api'
import type { User } from '../types'

interface AuthCtx {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data as User | null
  }

  useEffect(() => {
    // Primeiro verifica sessão existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id)
        setUser(profile)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await loadProfile(session.user.id)
          setUser(profile)
          setLoading(false)
        }
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        }
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          const profile = await loadProfile(session.user.id)
          setUser(profile)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider value={{
      user,
      loading,
      isAdmin: user?.role === 'admin',
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setUser(null)
      },
      refresh: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const profile = await loadProfile(session.user.id)
          setUser(profile)
        }
      },
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)