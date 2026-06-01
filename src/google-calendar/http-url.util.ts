/**
 * Google OAuth exige redirect_uri absoluto com esquema (http:// ou https://).
 * No .env é comum escrever só localhost:3000/... — isso gera Error 400 invalid_request.
 */
export function withHttpSchemeIfMissing(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `http://${t}`;
}
