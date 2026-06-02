import type { Request } from 'express';

function withHttpSchemeIfMissing(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `http://${t}`;
}

/**
 * URL do painel (SPA) para redirects a partir da API.
 * Quem acessa a API em localhost não deve cair no domínio de produção do .env.
 */
export function publicFrontendBase(req: Request): string {
  const host = (req.get('host') ?? '').toLowerCase();
  const isLocal =
    host.includes('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]');

  if (isLocal) {
    const raw =
      process.env.FRONTEND_APP_URL_LOCAL ?? 'http://localhost:5173';
    return withHttpSchemeIfMissing(raw).replace(/\/$/, '');
  }

  const raw = process.env.FRONTEND_APP_URL ?? 'http://localhost:5173';
  return withHttpSchemeIfMissing(raw).replace(/\/$/, '');
}
