import { clearAccessToken, getAccessToken } from '../auth/storage'

/**
 * Fetch para a API com `Authorization: Bearer` quando houver token.
 * Em 401 com token presente, limpa o armazenamento e envia ao login.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken()
  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (
    !headers.has('Content-Type') &&
    init?.body != null &&
    typeof init.body === 'string'
  ) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(input, { ...init, headers }).then((res) => {
    if (res.status === 401 && token) {
      clearAccessToken()
      const path = window.location.pathname
      if (path !== '/login') {
        window.location.assign('/login')
      }
    }
    return res
  })
}
