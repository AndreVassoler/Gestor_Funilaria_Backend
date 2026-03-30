import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MarcaModeloFields } from '../components/MarcaModeloFields'
import { API_BASE } from '../config/api'
import { apiFetch } from '../utils/apiFetch'
import { responseJson, tryResponseJson } from '../utils/apiJson'
import { hojeInputDate, inputClass } from '../constants/ordemUi'
import type { PrefillAgendamentoParaOrdem } from '../types/agendamento'
import * as F from '../utils/ordemForm'

type LocationAgendamento = {
  agendamento?: PrefillAgendamentoParaOrdem
}

export function NovaOrdemPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const agendamentoParaVincular = useRef<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msgAgenda, setMsgAgenda] = useState<string | null>(null)
  const [form, setForm] = useState({
    cliente: '',
    contato: '',
    marca: '',
    modelo: '',
    ano: '',
    placa: '',
    descricao: '',
    valor: '',
    dataAbertura: hojeInputDate(),
    previsaoEntrega: '',
  })

  useEffect(() => {
    const st = location.state as LocationAgendamento | null
    const pre = st?.agendamento
    if (!pre) return
    agendamentoParaVincular.current = pre.agendamentoId
    setMsgAgenda(
      `Campos preenchidos a partir do agendamento #${pre.agendamentoId}. Ao salvar, a vaga será marcada como finalizada e ligada à OS.`,
    )
    setForm((f) => ({
      ...f,
      cliente: pre.cliente || f.cliente,
      contato: pre.contato || f.contato,
      placa: pre.placa || f.placa,
      marca: pre.marca || f.marca,
      modelo: pre.modelo || f.modelo,
      ano:
        pre.ano != null
          ? String(pre.ano)
          : f.ano,
      descricao:
        pre.observacoes?.trim() !== ''
          ? pre.observacoes
          : f.descricao,
    }))
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const valorNum = F.parseValorCentavosToNumber(form.valor)
    if (Number.isNaN(valorNum) || valorNum < 0) {
      setError('Informe um valor válido.')
      setSubmitting(false)
      return
    }
    const anoNum = Number.parseInt(F.formatAno(form.ano), 10)
    const anoMax = new Date().getFullYear() + 1
    if (Number.isNaN(anoNum) || anoNum < 1900 || anoNum > anoMax) {
      setError(`Informe um ano válido (1900 a ${anoMax}).`)
      setSubmitting(false)
      return
    }
    const telDigits = F.onlyDigits(form.contato)
    if (telDigits.length < 10) {
      setError('Informe um telefone com DDD (10 ou 11 dígitos).')
      setSubmitting(false)
      return
    }
    const errPlaca = F.validarPlacaOuErro(form.placa)
    if (errPlaca) {
      setError(errPlaca)
      setSubmitting(false)
      return
    }
    const placaLimpa = F.buildPlacaStrict(F.placaAlnum(form.placa))
    try {
      const body: Record<string, unknown> = {
        cliente: F.titleCaseWords(form.cliente),
        contato: F.formatContato(form.contato),
        marca: F.titleCaseWords(form.marca),
        modelo: F.titleCaseWords(form.modelo),
        ano: anoNum,
        placa: placaLimpa,
        descricao: form.descricao.trim(),
        valor: valorNum,
        dataAbertura: form.dataAbertura || hojeInputDate(),
      }
      if (form.previsaoEntrega.trim()) {
        body.previsaoEntrega = form.previsaoEntrega
      }
      const res = await apiFetch(`${API_BASE}/ordens-servico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await tryResponseJson<{ message?: string | string[] }>(res)
        const msg = Array.isArray(b?.message)
          ? b.message[0]
          : typeof b?.message === 'string'
            ? b.message
            : undefined
        throw new Error(msg ?? `Não foi possível cadastrar (${res.status})`)
      }
      const created = await responseJson<{ id: number }>(res)
      const aid = agendamentoParaVincular.current
      if (aid != null) {
        try {
          await apiFetch(`${API_BASE}/agendamentos/${aid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ordemId: created.id,
              status: 'finalizado',
            }),
          })
        } catch {
          /* vinculação é opcional; OS já foi criada */
        }
        agendamentoParaVincular.current = null
      }
      const flashKey = `${created.id}-${Date.now()}`
      navigate('/?status=aberto', {
        state: {
          ordemCriada: true,
          ordemId: created.id,
          flashKey,
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar')
    } finally {
      setSubmitting(false)
    }
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

      {msgAgenda && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-100"
        >
          {msgAgenda}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-lg font-semibold">Nova ordem / veículo</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Preencha os dados para abrir uma nova ordem de serviço.
        </p>
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Cliente
            </span>
            <input
              required
              autoComplete="name"
              className={inputClass}
              value={form.cliente}
              onChange={(e) =>
                setForm((f) => ({ ...f, cliente: e.target.value }))
              }
              onBlur={() =>
                setForm((f) => ({
                  ...f,
                  cliente: F.titleCaseWords(f.cliente),
                }))
              }
              placeholder="Ex.: João da Silva"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Contato
            </span>
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={inputClass}
              value={form.contato}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  contato: F.formatContato(e.target.value),
                }))
              }
              placeholder="(11) 98765-4321"
            />
          </label>
          <MarcaModeloFields
            marca={form.marca}
            modelo={form.modelo}
            onMarcaChange={(marca) => setForm((f) => ({ ...f, marca }))}
            onModeloChange={(modelo) => setForm((f) => ({ ...f, modelo }))}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Ano
            </span>
            <input
              required
              type="text"
              inputMode="numeric"
              maxLength={4}
              className={`${inputClass} font-mono`}
              value={form.ano}
              onChange={(e) =>
                setForm((f) => ({ ...f, ano: F.formatAno(e.target.value) }))
              }
              placeholder="2022"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Placa
            </span>
            <input
              required
              className={`${inputClass} font-mono uppercase`}
              value={form.placa}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  placa: F.formatPlaca(e.target.value),
                }))
              }
              maxLength={8}
              title="Antigo: 3 letras + 4 números. Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex.: ABC-1D23)."
              placeholder="ABC-1234 ou ABC-1D23"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Data de abertura
            </span>
            <input
              required
              type="date"
              className={`${inputClass} font-mono`}
              value={form.dataAbertura}
              onChange={(e) =>
                setForm((f) => ({ ...f, dataAbertura: e.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Previsão de entrega
            </span>
            <input
              type="date"
              className={`${inputClass} font-mono`}
              value={form.previsaoEntrega}
              onChange={(e) =>
                setForm((f) => ({ ...f, previsaoEntrega: e.target.value }))
              }
            />
            <span className="text-xs text-slate-500">
              Opcional — usada para ordenar por urgência
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Valor estimado
            </span>
            <input
              required
              type="text"
              inputMode="numeric"
              className={`${inputClass} font-mono`}
              value={F.formatValorCentavosDigits(form.valor)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  valor: F.onlyDigits(e.target.value).slice(0, 12),
                }))
              }
              placeholder="R$ 0,00"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Descrição do serviço
            </span>
            <textarea
              required
              rows={3}
              className={`${inputClass} resize-y`}
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
            />
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:w-auto"
            >
              {submitting ? 'Salvando…' : 'Cadastrar ordem'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
