import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { FUNILARIA_NOME } from '../brand'

const navLinkClass =
  'rounded-lg px-3 py-2 text-sm font-medium transition-colors'

function navClass({ isActive }: { isActive: boolean }) {
  return [
    navLinkClass,
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  ].join(' ')
}

export function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {FUNILARIA_NOME}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ordens de serviço
            </h1>
          </div>
          <nav
            className="flex flex-wrap gap-1 border-t border-slate-200 pt-4 sm:border-t-0 sm:pt-0 dark:border-slate-800"
            aria-label="Principal"
          >
            <NavLink to="/" end className={navClass}>
              Painel
            </NavLink>
            <NavLink to="/nova" className={navClass}>
              Nova ordem
            </NavLink>
            <NavLink to="/agenda" className={navClass}>
              Agenda
            </NavLink>
            <NavLink to="/relatorios" className={navClass}>
              Relatórios
            </NavLink>
            <button
              type="button"
              onClick={() => {
                logout()
                void navigate('/login', { replace: true })
              }}
              className={`${navLinkClass} text-slate-500 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800`}
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
