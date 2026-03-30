import { apiFetch } from './apiFetch'

function pickFilename(
  dispo: string | null,
  fallbackFilename: string,
): string {
  if (!dispo) return fallbackFilename
  const m = dispo.match(/filename="?([^";]+)"?/i)
  return m?.[1] ? m[1] : fallbackFilename
}

/** Baixa PDF a partir de uma URL da API (GET). */
export async function downloadPdfFromUrl(
  url: string,
  fallbackFilename: string,
) {
  const res = await apiFetch(url)
  if (!res.ok) {
    throw new Error(`Falha ao gerar PDF (${res.status})`)
  }
  const blob = await res.blob()
  const name = pickFilename(res.headers.get('Content-Disposition'), fallbackFilename)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Baixa anexo (PDF, Excel etc.) a partir de uma URL da API (GET). */
export async function downloadAttachmentFromUrl(
  url: string,
  fallbackFilename: string,
) {
  const res = await apiFetch(url)
  if (!res.ok) {
    throw new Error(`Falha ao baixar arquivo (${res.status})`)
  }
  const blob = await res.blob()
  const name = pickFilename(res.headers.get('Content-Disposition'), fallbackFilename)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
