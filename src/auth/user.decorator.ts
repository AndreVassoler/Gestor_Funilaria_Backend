import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser } from './types';

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    return req.user;
  },
);
