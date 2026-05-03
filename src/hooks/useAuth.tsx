import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

  const load = async () => {
    const u = await authService.getCurrentUser()
    setUser(u)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, _session) => {
        if (event === 'SIGNED_IN') await load()
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
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
        const { error } = await authService.signIn(email, password)
        if (error) throw error
        await load()
      },
      signOut: async () => {
        await authService.signOut()
        setUser(null)
      },
      refresh: load,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)