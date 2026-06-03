import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Protege rotas de cron externo (ex.: GitHub Actions) via header
 * `X-Notify-Cron-Secret`, igual a NOTIFY_CRON_SECRET no servidor.
 */
@Injectable()
export class NotifyCronGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.NOTIFY_CRON_SECRET?.trim();
    if (!expected) {
      throw new UnauthorizedException(
        'NOTIFY_CRON_SECRET não configurado no servidor.',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const got = req.get('x-notify-cron-secret')?.trim();
    if (!got || got !== expected) {
      throw new UnauthorizedException('Segredo de cron inválido.');
    }

    return true;
  }
}
