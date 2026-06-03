import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from './auth/public.decorator';
import { publicFrontendBase } from './public-frontend-url.util';

/**
 * Quem abre a raiz da API no navegador é redirecionado ao painel (SPA).
 */
@Controller()
export class RootController {
  @Public()
  @Get()
  root(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
    const base = publicFrontendBase(req);
    res.redirect(302, `${base}/`);
    return;
  }

  @Public()
  @Get('login')
  login(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
    const base = publicFrontendBase(req);
    res.redirect(302, `${base}/login`);
    return;
  }

  /** Usado por GitHub Actions / monitoramento para evitar sleep no Railway. */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
