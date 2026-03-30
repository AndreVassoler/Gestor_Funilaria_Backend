import { useEffect, useState } from 'react'
import type { OrdemServico, OrdemServicoStatus } from '../types/ordem'
import * as F from '../utils/ordemForm'
import { apiFetch } from '../utils/apiFetch'
import { responseJson, tryResponseJson } from '../utils/apiJson'
import { downloadPdfFromUrl } from '../utils/pdfDownload'
import { MarcaModeloFields } from './MarcaModeloFields'
import { OrdensFotosSection } from './OrdensFotosSection'

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none ring-slate-400/30 focus:ring-2 dark:border-slate-700 dark:bg-slate-950'

const STATUS_OPTIONS: { value: OrdemServicoStatus; label: string }[] = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'fazendo', label: 'Em andamento' },
  { value: 'pronto', label: 'Pronto' },
]

type Props = {
  ordem: OrdemServico
  apiBase: string
  onClose: () => void
  onSaved: () => void
  onFotosChange?: () => void
  onError: (msg: string) => void
}

export function EditOrdemModal({
  ordem,
  apiBase,
  onClose,
  onSaved,
  onFotosChange,
  onError,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    cliente: '',
    contato: '',
    marca: '',
    modelo: '',
    ano: '',
    placa: '',
    descricao: '',
    valor: '',
    dataAbertura: '',
    previsaoEntrega: '',
    dataConclusao: '',
    status: 'aberto' as OrdemServicoStatus,
  })

  useEffect(() => {
    setForm({
      cliente: ordem.cliente,
      contato: F.formatContato(ordem.contato),
      marca: ordem.marca,
      modelo: ordem.modelo,
      ano: String(ordem.ano),
      placa: F.formatPlacaStored(ordem.placa),
      descricao: ordem.descricao,
      valor: F.valorNumberToCentavosDigits(ordem.valor),
      dataAbertura: F.toInputDate(ordem.dataAbertura),
      previsaoEntrega: F.toInputDate(ordem.previsaoEntrega),
      dataConclusao: F.toInputDate(ordem.dataConclusao),
      status: ordem.status,
    })
  }, [ordem])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    onError('')

    const valorNum = F.parseValorCentavosToNumber(form.valor)
    if (Number.isNaN(valorNum) || valorNum < 0) {
      onError('Informe um valor válido.')
      setSaving(false)
      return
    }

    const anoNum = Number.parseInt(F.formatAno(form.ano), 10)
    const anoMax = new Date().getFullYear() + 1
    if (
      Number.isNaN(anoNum) ||
      anoNum < 1900 ||
      anoNum > anoMax
    ) {
      onError(`Informe um ano válido (1900 a ${anoMax}).`)
      setSaving(false)
      return
    }

    const telDigits = F.onlyDigits(form.contato)
    if (telDigits.length < 10) {
      onError('Informe um telefone com DDD (10 ou 11 dígitos).')
      setSaving(false)
      return
    }

    const errPlaca = F.validarPlacaOuErro(form.placa)
    if (errPlaca) {
      onError(errPlaca)
      setSaving(false)
      return
    }
    const placaLimpa = F.buildPlacaStrict(F.placaAlnum(form.placa))

    if (!form.dataAbertura) {
      onError('Informe a data de abertura.')
      setSaving(false)
      return
    }

    try {
      const res = await apiFetch(`${apiBase}/ordens-servico/${ordem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: F.titleCaseWords(form.cliente),
          contato: F.formatContato(form.contato),
          marca: F.titleCaseWords(form.marca),
          modelo: F.titleCaseWords(form.modelo),
          ano: anoNum,
          placa: placaLimpa,
          descricao: form.descricao.trim(),
          valor: valorNum,
          dataAbertura: form.dataAbertura,
          previsaoEntrega: form.previsaoEntrega.trim()
            ? form.previsaoEntrega
            : null,
          status: form.status,
          ...(form.status === 'pronto' && form.dataConclusao.trim()
            ? { dataConclusao: form.dataConclusao }
            : {}),
        }),
      })
      if (!res.ok) {
        const body = await tryResponseJson<{ message?: string | string[] }>(res)
        const msg = Array.isArray(body?.message)
          ? body.message[0]
          : typeof body?.message === 'string'
            ? body.message
            : undefined
        throw new Error(msg ?? `Não foi possível salvar (${res.status})`)
      }
      await responseJson<unknown>(res)
      onSaved()
      onClose()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-ordem-title"
        className="my-4 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id="edit-ordem-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Editar ordem #{ordem.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="grid max-h-[min(70vh,640px)] gap-4 overflow-y-auto pr-1 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Cliente
            </span>
            <input
              required
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
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Contato
            </span>
            <input
              required
              type="tel"
              inputMode="tel"
              className={inputClass}
              value={form.contato}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  contato: F.formatContato(e.target.value),
                }))
              }
            />
          </label>

          <div className="sm:col-span-2">
            <MarcaModeloFields
              marca={form.marca}
              modelo={form.modelo}
              onMarcaChange={(marca) => setForm((f) => ({ ...f, marca }))}
              onModeloChange={(modelo) => setForm((f) => ({ ...f, modelo }))}
            />
          </div>

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
              Opcional — ordem sem data fica por último na lista “urgente”
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
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
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Status
            </span>
            <select
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              value={form.status}
              disabled={ordem.status === 'pronto'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as OrdemServicoStatus,
                }))
              }
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {ordem.status === 'pronto' && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ordem concluída: o status não pode voltar para aberto ou em
                andamento.
              </span>
            )}
          </label>

          {form.status === 'pronto' && (
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Data de conclusão (fiscal)
              </span>
              <input
                type="date"
                className={`${inputClass} font-mono`}
                value={form.dataConclusao}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dataConclusao: e.target.value }))
                }
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Usada no relatório por ano/mês. Se estiver vazia ao salvar, o
                sistema pode preencher automaticamente; informe a data real da
                conclusão para bater com seu livro-caixa ou NF.
              </span>
            </label>
          )}

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

          <div className="sm:col-span-2">
            <OrdensFotosSection
              ordemId={ordem.id}
              apiBase={apiBase}
              onChange={onFotosChange}
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => {
                void downloadPdfFromUrl(
                  `${apiBase}/ordens-servico/${ordem.id}/pdf`,
                  `os-${ordem.id}-assinatura.pdf`,
                ).catch(() => onError('Falha ao gerar PDF'))
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              PDF para assinatura
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
