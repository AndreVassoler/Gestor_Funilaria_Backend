import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { GoogleCalendarService } from './google-calendar.service';
import { withHttpSchemeIfMissing } from './http-url.util';

@Controller('integracoes/google-calendar')
export class GoogleCalendarController {
  constructor(private readonly gc: GoogleCalendarService) {}

  @Get('status')
  async status() {
    const oauthConfigured = this.gc.isOAuthConfigured();
    return {
      oauthConfigured,
      connected: await this.gc.isConnected(),
      redirectUriEffective: oauthConfigured
        ? this.gc.getEffectiveRedirectUri()
        : null,
      clientId: oauthConfigured ? this.gc.getConfiguredClientId() : null,
    };
  }

  @Public()
  @Get('authorize')
  authorize(@Res({ passthrough: false }) res: Response) {
    if (!this.gc.isOAuthConfigured()) {
      throw new UnauthorizedException(
        'Google Calendar não configurado no servidor (variáveis de ambiente).',
      );
    }
    const url = this.gc.buildAuthUrl();
    res.redirect(302, url);
    return;
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('error') err: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ) {
    const front = withHttpSchemeIfMissing(
      (process.env.FRONTEND_APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
    );
    if (err) {
      res.redirect(302, `${front}/agenda?google=erro`);
      return;
    }
    if (!code) {
      res.redirect(302, `${front}/agenda?google=erro`);
      return;
    }
    try {
      await this.gc.saveTokensFromCode(code);
      res.redirect(302, `${front}/agenda?google=ok`);
    } catch {
      res.redirect(302, `${front}/agenda?google=erro`);
    }
    return;
  }

  @Post('disconnect')
  async disconnect() {
    await this.gc.disconnect();
    return { ok: true };
  }
}
