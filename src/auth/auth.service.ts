import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { timingSafeEqual } from 'crypto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  private safeComparePlain(a: string, b: string): boolean {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ba.length !== bb.length) {
      return false;
    }
    return timingSafeEqual(ba, bb);
  }

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<boolean> {
    const expectedUser = (process.env.AUTH_USERNAME ?? 'admin').trim();
    if (username.trim() !== expectedUser) {
      return false;
    }

    const hash = process.env.AUTH_PASSWORD_HASH?.trim();
    if (hash) {
      return bcrypt.compare(password, hash);
    }

    const plain = process.env.AUTH_PASSWORD;
    if (plain !== undefined && plain !== '') {
      return this.safeComparePlain(password, plain);
    }

    return false;
  }

  async login(dto: LoginDto) {
    const ok = await this.validateCredentials(dto.username, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }

    const sub = dto.username.trim();
    const access_token = await this.jwt.signAsync({ sub });

    return {
      access_token,
      token_type: 'bearer' as const,
    };
  }
}
