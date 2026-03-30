import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { API_BASE } from '../config/api'
import { parseApiJsonText } from '../utils/apiJson'
import { clearAccessToken, getAccessToken, setAccessToken } from './storage'

type AuthContextValue = {
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken())

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const raw = await res.text()
    if (!res.ok) {
      let msg = 'Falha no login.'
      try {
        const j = parseApiJsonText<{ message?: string | string[] }>(raw)
        if (typeof j.message === 'string') msg = j.message
        else if (Array.isArray(j.message)) msg = j.message.join(', ')
      } catch (e) {
        msg = e instanceof Error ? e.message : msg
      }
      throw new Error(msg)
    }
    const data = parseApiJsonText<{ access_token: string }>(raw)
    setAccessToken(data.access_token)
    setToken(data.access_token)
  }, [])

  const logout = useCallback(() => {
    clearAccessToken()
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return ctx
}
