import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../utils/apiFetch'
import { responseJson } from '../utils/apiJson'
import type { OrdemFotoItem } from '../types/ordem'

type Props = {
  ordemId: number
  apiBase: string
  onChange?: () => void
}

export function OrdensFotosSection({ ordemId, apiBase, onChange }: Props) {
  const [fotos, setFotos] = useState<OrdemFotoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const r = await apiFetch(`${apiBase}/ordens-servico/${ordemId}/fotos`)
      if (!r.ok) throw new Error('Falha ao carregar fotos')
      const data = await responseJson<OrdemFotoItem[]>(r)
      setFotos(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [apiBase, ordemId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  async function upload(tipo: 'antes' | 'depois', file: File) {
    setErr(null)
    const fd = new FormData()
    fd.append('arquivo', file)
    fd.append('tipo', tipo)
    try {
      const r = await apiFetch(`${apiBase}/ordens-servico/${ordemId}/fotos`, {
        method: 'POST',
        body: fd,
      })
      if (!r.ok) {
        const t = await r.text()
        throw new Error(t || `Envio falhou (${r.status})`)
      }
      await load()
      onChange?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro no envio')
    }
  }

  async function remover(fotoId: number) {
    if (!confirm('Remover esta foto?')) return
    setErr(null)
    try {
      const r = await apiFetch(
        `${apiBase}/ordens-servico/${ordemId}/fotos/${fotoId}`,
        { method: 'DELETE' },
      )
      if (!r.ok) throw new Error('Falha ao remover')
      await load()
      onChange?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao remover')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/50">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Fotos do veículo (antes / depois)
      </p>
      {err && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">{err}</p>
      )}
      {loading ? (
        <p className="text-xs text-slate-500">Carregando fotos…</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-2">
          {fotos.map((f) => (
            <li
              key={f.id}
              className="relative w-[88px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700"
            >
              <img
                src={`${apiBase}${f.url}`}
                alt={f.tipo}
                className="h-20 w-full object-cover"
              />
              <span className="block truncate bg-slate-900/80 px-1 text-center text-[10px] font-medium text-white capitalize">
                {f.tipo}
              </span>
              <button
                type="button"
                onClick={() => void remover(f.id)}
                className="absolute right-0.5 top-0.5 rounded bg-red-600 px-1 text-[10px] text-white hover:bg-red-700"
                title="Remover"
              >
                ×
              </button>
            </li>
          ))}
          {fotos.length === 0 && (
            <li className="text-xs text-slate-500">Nenhuma foto ainda.</li>
          )}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          + Antes
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void upload('antes', file)
              e.target.value = ''
            }}
          />
        </label>
        <label className="cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          + Depois
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void upload('depois', file)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
