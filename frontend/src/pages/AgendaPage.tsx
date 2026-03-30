import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MarcaModeloFields } from '../components/MarcaModeloFields'
import { API_BASE } from '../config/api'
import { apiFetch } from '../utils/apiFetch'
import { responseJson, tryResponseJson } from '../utils/apiJson'
import {
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_STATUS_RING,
} from '../constants/agendaUi'
import { inputClass } from '../constants/ordemUi'
import type {
  Agendamento,
  AgendamentoStatus,
  PrefillAgendamentoParaOrdem,
} from '../types/agendamento'
import {
  fimSemanaSabado,
  inicioSemanaDomingo,
  labelDiaCurto,
  toYMD,
} from '../utils/agendaDatas'
import * as F from '../utils/ordemForm'

type ModalMode = 'novo' | 'editar' | null

type GoogleCalStatus = {
  oauthConfigured: boolean
  connected: boolean
  redirectUriEffective?: string | null
  clientId?: string | null
}

export function AgendaPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [googleCal, setGoogleCal] = useState<GoogleCalStatus | null>(null)
  const [googleFlash, setGoogleFlash] = useState<string | null>(null)
  const [weekRef, setWeekRef] = useState(() => new Date())
  const [diaIdx, setDiaIdx] = useState(() => new Date().getDay())
  const [lista, setLista] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalMode>(null)
  const [editando, setEditando] = useState<Agendamento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [formErro, setFormErro] = useState<string | null>(null)

  const [fCliente, setFCliente] = useState('')
  const [fContato, setFContato] = useState('')
  const [fPlaca, setFPlaca] = useState('')
  const [fMarca, setFMarca] = useState('')
  const [fModelo, setFModelo] = useState('')
  const [fAno, setFAno] = useState('')
  const [fDia, setFDia] = useState('')
  const [fObs, setFObs] = useState('')
  const [fStatus, setFStatus] = useState<AgendamentoStatus>('agendado')

  const weekStart = useMemo(() => inicioSemanaDomingo(weekRef), [weekRef])
  const weekEnd = useMemo(() => fimSemanaSabado(weekRef), [weekRef])

  const diaSelecionado = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + diaIdx)
    return d
  }, [weekStart, diaIdx])

  const carregar = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const de = toYMD(weekStart)
      const ate = toYMD(weekEnd)
      const res = await apiFetch(
        `${API_BASE}/agendamentos?de=${de}&ate=${encodeURIComponent(ate)}`,
      )
      if (!res.ok) throw new Error('Falha ao carregar agendamentos')
      setLista(await responseJson<Agendamento[]>(res))
    } catch (e) {
      setLista([])
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch(
          `${API_BASE}/integracoes/google-calendar/status`,
        )
        if (!res.ok) return
        const data = await responseJson<GoogleCalStatus>(res)
        if (!cancelled) setGoogleCal(data)
      } catch {
        if (!cancelled) setGoogleCal(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const g = searchParams.get('google')
    if (!g) return
    if (g === 'ok') {
      setGoogleFlash(
        'Conta Google conectada. Novos agendamentos passam a aparecer automaticamente na sua agenda Google.',
      )
    } else if (g === 'erro') {
      setGoogleFlash(
        'Não foi possível conectar ao Google. Verifique as credenciais no Google Cloud e tente de novo.',
      )
    }
    setSearchParams({}, { replace: true })
    void (async () => {
      try {
        const res = await apiFetch(
          `${API_BASE}/integracoes/google-calendar/status`,
        )
        if (res.ok) setGoogleCal(await responseJson<GoogleCalStatus>(res))
      } catch {
        /* ignore */
      }
    })()
  }, [searchParams, setSearchParams])

  async function desconectarGoogle() {
    if (!window.confirm('Desconectar Google Agenda? Novos agendamentos não serão mais enviados.'))
      return
    try {
      const res = await apiFetch(
        `${API_BASE}/integracoes/google-calendar/disconnect`,
        {
          method: 'POST',
        },
      )
      if (!res.ok) throw new Error('Falha')
      setGoogleCal((c) =>
        c ? { ...c, connected: false } : { oauthConfigured: true, connected: false },
      )
      setGoogleFlash('Google Agenda desconectada.')
    } catch {
      setError('Não foi possível desconectar.')
    }
  }

  const contagemPorDia = useMemo(() => {
    const c = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      const y = toYMD(d)
      c[i] = lista.filter(
        (a) => a.dia === y && a.status !== 'cancelado',
      ).length
    }
    return c
  }, [lista, weekStart])

  const listaDia = useMemo(() => {
    const y = toYMD(diaSelecionado)
    return lista
      .filter((a) => a.dia === y)
      .sort((x, y) => x.id - y.id)
  }, [lista, diaSelecionado])

  function abrirNovo() {
    setFormErro(null)
    setEditando(null)
    setFCliente('')
    setFContato('')
    setFPlaca('')
    setFMarca('')
    setFModelo('')
    setFAno('')
    setFDia(toYMD(diaSelecionado))
    setFObs('')
    setFStatus('agendado')
    setModal('novo')
  }

  function abrirEditar(a: Agendamento) {
    setFormErro(null)
    setEditando(a)
    setFCliente(a.cliente)
    setFContato(a.contato)
    setFPlaca(a.placa ? F.formatPlacaStored(a.placa) : '')
    setFMarca(a.marca)
    setFModelo(a.modelo)
    setFAno(a.ano != null ? String(a.ano) : '')
    setFDia(a.dia)
    setFObs(a.observacoes || '')
    setFStatus(a.status)
    setModal('editar')
  }

  function fecharModal() {
    if (salvando) return
    setModal(null)
    setEditando(null)
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setFormErro(null)
    setSalvando(true)
    try {
      const telDigits = F.onlyDigits(fContato)
      if (telDigits.length < 10) {
        setFormErro('Informe um telefone com DDD (10 ou 11 dígitos).')
        return
      }
      let placaLimpa = ''
      if (fPlaca.trim()) {
        const errPlaca = F.validarPlacaOuErro(fPlaca)
        if (errPlaca) {
          setFormErro(errPlaca)
          return
        }
        placaLimpa = F.buildPlacaStrict(F.placaAlnum(fPlaca))
      }
      let anoNum: number | null = null
      if (fAno.trim()) {
        anoNum = Number.parseInt(F.formatAno(fAno), 10)
        const anoMax = new Date().getFullYear() + 1
        if (Number.isNaN(anoNum) || anoNum < 1900 || anoNum > anoMax) {
          setFormErro(`Ano inválido (1900 a ${anoMax}).`)
          return
        }
      }
      if (!fDia) {
        setFormErro('Informe a data.')
        return
      }
      const body: Record<string, unknown> = {
        cliente: F.titleCaseWords(fCliente),
        contato: F.formatContato(fContato),
        placa: placaLimpa,
        marca: F.titleCaseWords(fMarca),
        modelo: F.titleCaseWords(fModelo),
        ano: anoNum,
        dia: fDia,
        observacoes: fObs.trim(),
      }
      if (modal === 'editar' && editando) {
        body.status = fStatus
        const res = await apiFetch(`${API_BASE}/agendamentos/${editando.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const b = await tryResponseJson<{ message?: string | string[] }>(res)
          throw new Error(
            Array.isArray(b?.message)
              ? b.message.join(', ')
              : typeof b?.message === 'string'
                ? b.message
                : `Erro ${res.status}`,
          )
        }
      } else {
        const res = await apiFetch(`${API_BASE}/agendamentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const b = await tryResponseJson<{ message?: string | string[] }>(res)
          throw new Error(
            Array.isArray(b?.message)
              ? b.message.join(', ')
              : typeof b?.message === 'string'
                ? b.message
                : `Erro ${res.status}`,
          )
        }
        const criado = await responseJson<Agendamento>(res)
        if (googleCal?.connected && !criado.googleEventId) {
          setGoogleFlash(
            'Agendamento salvo, mas o Google Agenda não recebeu o evento. Reinicie o backend após editar o .env e confira o terminal (mensagens Google Calendar).',
          )
        }
      }
      fecharModal()
      void carregar()
    } catch (e) {
      setFormErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function patchStatus(a: Agendamento, status: AgendamentoStatus) {
    setError(null)
    try {
      const res = await apiFetch(`${API_BASE}/agendamentos/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Não foi possível atualizar')
      void carregar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function excluir(a: Agendamento) {
    if (
      !window.confirm(
        `Excluir agendamento de ${a.cliente} (${a.dia})?`,
      )
    )
      return
    setError(null)
    try {
      const res = await apiFetch(`${API_BASE}/agendamentos/${a.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Não foi possível excluir')
      void carregar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    }
  }

  function irParaNovaOrdem(a: Agendamento) {
    const pre: PrefillAgendamentoParaOrdem = {
      agendamentoId: a.id,
      cliente: a.cliente,
      contato: a.contato,
      placa: a.placa ? F.formatPlacaStored(a.placa) : '',
      marca: a.marca,
      modelo: a.modelo,
      ano: a.ano,
      observacoes: [a.observacoes, `(Agendamento #${a.id})`]
        .filter(Boolean)
        .join('\n'),
    }
    navigate('/nova', { state: { agendamento: pre } })
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <header className="mb-8 overflow-hidden rounded-2xl border border-teal-300/40 bg-linear-to-br from-teal-700 via-teal-800 to-slate-900 px-6 py-7 shadow-lg dark:border-teal-800/40 dark:from-teal-950 dark:via-teal-950 dark:to-slate-950">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Agenda
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-teal-100/90">
          Reservas por dia (sem horário). Vários clientes podem estar no mesmo
          dia. Ao chegar o veículo, use &quot;Abrir OS&quot; para cadastrar a
          ordem; o agendamento é marcado como finalizado e ligado à OS.
        </p>
      </header>

      {googleFlash && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-100"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{googleFlash}</span>
            <button
              type="button"
              onClick={() => setGoogleFlash(null)}
              className="shrink-0 text-xs font-medium text-teal-800 underline dark:text-teal-200"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {googleCal && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Google Agenda (API)
          </p>
          {!googleCal.oauthConfigured ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Integração desativada no servidor: defina{' '}
              <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
                GOOGLE_CALENDAR_CLIENT_ID
              </code>
              ,{' '}
              <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
                GOOGLE_CALENDAR_CLIENT_SECRET
              </code>{' '}
              e{' '}
              <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
                GOOGLE_CALENDAR_REDIRECT_URI
              </code>{' '}
              no backend (veja <code className="text-xs">backend/.env.example</code>
              ).
            </p>
          ) : googleCal.connected ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Conta conectada — ao salvar um agendamento aqui, o evento é criado
                na sua agenda Google automaticamente (e atualizado ao editar).
              </p>
              <button
                type="button"
                onClick={() => void desconectarGoogle()}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Desconectar Google
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Conecte uma vez com sua conta Google. Depois disso, cada novo
                agendamento vira evento no seu Google Agenda — sem copiar URL.
                No iPhone, adicione a mesma conta Google em Ajustes → Calendário
                para ver os eventos no app Calendário.
              </p>
              <div className="rounded-lg border border-violet-200 bg-violet-50/90 p-3 text-sm text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-100">
                <p className="font-medium">
                  Se aparecer “app em fase de testes” ou{' '}
                  <code className="text-xs">403: access_denied</code>:
                </p>
                <p className="mt-2 text-slate-800 dark:text-slate-200">
                  No{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials/consent"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-violet-800 underline dark:text-violet-200"
                  >
                    Google Cloud → Tela de consentimento OAuth
                  </a>
                  , com o app em <strong>Teste</strong>, adicione cada Gmail que
                  for usar em <strong>Usuários de teste</strong> (incluindo o
                  seu). Salve e tente conectar de novo com essa mesma conta.
                </p>
              </div>
              {googleCal.redirectUriEffective ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-medium">
                    Se aparecer <code className="text-xs">redirect_uri_mismatch</code>:
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-800 dark:text-slate-200">
                    <li>
                      Google Cloud → <strong>APIs e serviços</strong> →{' '}
                      <strong>Credenciais</strong>.
                    </li>
                    <li>
                      Abra o cliente OAuth do tipo <strong>Aplicativo da Web</strong>{' '}
                      cujo <strong>ID do cliente</strong> seja exatamente o do seu{' '}
                      <code className="text-xs">.env</code> (abaixo).
                    </li>
                    <li>
                      Em <strong>URIs de redirecionamento autorizados</strong>, clique
                      em <strong>Adicionar URI</strong> e cole <strong>sem alterar</strong>{' '}
                      (sem barra no fim):
                    </li>
                  </ol>
                  <code className="mt-2 block break-all rounded bg-white px-2 py-1.5 text-xs text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                    {googleCal.redirectUriEffective}
                  </code>
                  {googleCal.clientId ? (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      Client ID deste servidor:{' '}
                      <code className="break-all text-slate-800 dark:text-slate-200">
                        {googleCal.clientId}
                      </code>
                    </p>
                  ) : null}
                </div>
              ) : null}
              <a
                href={`${API_BASE}/integracoes/google-calendar/authorize`}
                className="inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 sm:w-fit"
              >
                Conectar Google Agenda
              </a>
            </div>
          )}
        </section>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const d = new Date(weekStart)
              d.setDate(d.getDate() - 7)
              setWeekRef(d)
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            « Semana anterior
          </button>
          <button
            type="button"
            onClick={() => setWeekRef(new Date())}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date(weekStart)
              d.setDate(d.getDate() + 7)
              setWeekRef(d)
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Próxima semana »
          </button>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Atualizar
        </button>
      </div>

      <p className="mb-3 text-center text-sm text-slate-500 dark:text-slate-400">
        Semana de {toYMD(weekStart)} a {toYMD(weekEnd)}
      </p>

      <div className="mb-6 grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart)
          d.setDate(d.getDate() + i)
          const ativo = i === diaIdx
          const n = contagemPorDia[i] ?? 0
          return (
            <button
              key={i}
              type="button"
              onClick={() => setDiaIdx(i)}
              className={
                ativo
                  ? 'rounded-xl bg-teal-700 px-1 py-3 text-center text-xs font-semibold text-white shadow sm:px-2 sm:text-sm dark:bg-teal-600'
                  : 'rounded-xl border border-slate-200 bg-white px-1 py-3 text-center text-xs text-slate-700 hover:bg-slate-50 sm:px-2 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }
            >
              <span className="block">{labelDiaCurto(d)}</span>
              <span
                className={
                  ativo
                    ? 'mt-1 block text-[10px] font-normal opacity-90 sm:text-xs'
                    : 'mt-1 block text-[10px] text-slate-500 sm:text-xs dark:text-slate-400'
                }
              >
                {n} {n === 1 ? 'agendamento' : 'agendamentos'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {diaSelecionado.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </h3>
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Novo agendamento
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando…</p>
      ) : listaDia.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
          Nenhum agendamento neste dia. Clique em &quot;Novo agendamento&quot;.
        </p>
      ) : (
        <ul className="space-y-3">
          {listaDia.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                      #{a.id}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${AGENDAMENTO_STATUS_RING[a.status]}`}
                    >
                      {AGENDAMENTO_STATUS_LABEL[a.status]}
                    </span>
                    {a.ordemId != null && (
                      <Link
                        to="/"
                        className="text-xs font-medium text-teal-700 underline hover:text-teal-900 dark:text-teal-400"
                      >
                        OS #{a.ordemId}
                      </Link>
                    )}
                  </div>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                    {a.cliente}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {F.formatContato(a.contato)}
                  </p>
                  {(a.marca || a.modelo || a.placa) && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {[a.marca, a.modelo].filter(Boolean).join(' ')}
                      {a.placa
                        ? ` · ${F.formatPlacaStored(a.placa)}`
                        : ''}
                    </p>
                  )}
                  {a.observacoes ? (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
                      {a.observacoes}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  {a.status !== 'cancelado' && a.status !== 'finalizado' && (
                    <>
                      <button
                        type="button"
                        onClick={() => irParaNovaOrdem(a)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                      >
                        Abrir OS
                      </button>
                      {a.status === 'agendado' && (
                        <button
                          type="button"
                          onClick={() => void patchStatus(a, 'confirmado')}
                          className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/40"
                        >
                          Confirmar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void patchStatus(a, 'cancelado')}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirEditar(a)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void excluir(a)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agenda-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fecharModal()
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3
              id="agenda-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {modal === 'novo' ? 'Novo agendamento' : 'Editar agendamento'}
            </h3>
            {formErro && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {formErro}
              </p>
            )}
            <form onSubmit={(e) => void submitForm(e)} className="mt-4 space-y-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Cliente
                </span>
                <input
                  className={inputClass}
                  value={fCliente}
                  onChange={(e) => setFCliente(e.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Contato (WhatsApp / telefone)
                </span>
                <input
                  className={inputClass}
                  value={fContato}
                  onChange={(e) =>
                    setFContato(F.formatContato(e.target.value))
                  }
                  required
                  inputMode="tel"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Placa (opcional na reserva)
                </span>
                <input
                  className={inputClass}
                  value={fPlaca}
                  onChange={(e) =>
                    setFPlaca(F.formatPlaca(e.target.value))
                  }
                  placeholder="Se ainda não souber, deixe em branco"
                />
              </label>
              <MarcaModeloFields
                marca={fMarca}
                modelo={fModelo}
                onMarcaChange={setFMarca}
                onModeloChange={setFModelo}
              />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Ano do veículo
                </span>
                <input
                  className={inputClass}
                  value={fAno}
                  onChange={(e) => setFAno(F.formatAno(e.target.value))}
                  inputMode="numeric"
                  placeholder="Opcional"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Data
                </span>
                <input
                  type="date"
                  className={`${inputClass} font-mono`}
                  value={fDia}
                  onChange={(e) => setFDia(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Observações
                </span>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  value={fObs}
                  onChange={(e) => setFObs(e.target.value)}
                  rows={3}
                />
              </label>
              {modal === 'editar' && (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </span>
                  <select
                    className={inputClass}
                    value={fStatus}
                    onChange={(e) =>
                      setFStatus(e.target.value as AgendamentoStatus)
                    }
                  >
                    {(Object.keys(AGENDAMENTO_STATUS_LABEL) as AgendamentoStatus[]).map(
                      (s) => (
                        <option key={s} value={s}>
                          {AGENDAMENTO_STATUS_LABEL[s]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600"
                >
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
