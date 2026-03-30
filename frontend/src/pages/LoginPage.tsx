import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { API_BASE, isDeployedWithoutApiUrl } from '../config/api'
import { FUNILARIA_NOME } from '../brand'
import { inputClass } from '../constants/ordemUi'

/** Cor explícita: Tailwind preflight usa `color: inherit` em inputs; sem isso o texto pode ficar igual ao fundo (parece que não digita). */
const loginInputClass = `${inputClass} w-full min-w-0 text-slate-900 dark:text-slate-100`

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md">
        <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          {FUNILARIA_NOME}
        </p>
        <h1 className="mt-1 text-center text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Acesso ao sistema
        </h1>

        {isDeployedWithoutApiUrl && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <p className="font-semibold">API não configurada neste build</p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
              No Railway (serviço do <strong>frontend</strong>), crie a variável{' '}
              <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/80">
                VITE_API_URL
              </code>{' '}
              com a URL pública da API (ex.: <code className="break-all">…up.railway.app</code>, sem barra no
              final) e faça um <strong>novo deploy</strong> do frontend. Sem isso o app usa{' '}
              <code className="rounded bg-amber-200/80 px-1 dark:bg-amber-900/80">
                {API_BASE}
              </code>{' '}
              e não conecta na nuvem.
            </p>
          </div>
        )}

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="relative z-10 mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="login-user"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Usuário
            </label>
            <input
              id="login-user"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={loginInputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="login-pass"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Senha
            </label>
            <input
              id="login-pass"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={loginInputClass}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
