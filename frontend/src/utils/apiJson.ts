/** Quando VITE_API_URL aponta para o SPA ou o proxy devolve index.html. */
export const API_RETORNO_HTML_MSG =
  'O servidor respondeu com uma página HTML em vez da API (JSON). Confira VITE_API_URL no frontend: ela deve ser a URL do backend Nest (ex.: http://localhost:3000), com a API rodando. Em produção, não use a mesma URL do site estático do painel se ele redirecionar tudo para index.html.'

function parseJsonText<T>(text: string): T {
  const start = text.trimStart()
  if (start.startsWith('<')) {
    throw new Error(API_RETORNO_HTML_MSG)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Resposta inválida: não é JSON.')
  }
}

/** Lê o corpo da resposta como JSON; mensagem clara se vier HTML (URL da API errada). */
export async function responseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  return parseJsonText<T>(text)
}

/** Para respostas de erro: tenta JSON; se for HTML ou inválido, retorna null. */
export async function tryResponseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text()
  const start = text.trimStart()
  if (start.startsWith('<')) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/** Parse de texto já carregado (ex.: login com um único .text()). */
export function parseApiJsonText<T>(text: string): T {
  return parseJsonText<T>(text)
}
