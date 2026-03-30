const raw = import.meta.env.VITE_API_URL as string | undefined
const trimmed = raw?.trim()

export const API_BASE =
  trimmed && trimmed.length > 0
    ? trimmed.replace(/\/$/, '')
    : 'http://localhost:3000'

/** Build de produção sem VITE_API_URL → o app tenta localhost e não alcança a API no Railway. */
export const isDeployedWithoutApiUrl =
  import.meta.env.PROD && (!trimmed || trimmed.length === 0)
