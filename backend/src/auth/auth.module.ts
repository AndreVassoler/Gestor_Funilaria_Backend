import { Module } from '@nestjs/common';
import {
  JwtModule,
  type JwtModuleOptions,
  type JwtSignOptions,
} from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'Defina JWT_SECRET no ambiente (veja backend/.env.example).',
          );
        }
        const expiresRaw = process.env.JWT_EXPIRES_IN?.trim();
        const expiresIn = (
          expiresRaw && /^\d+$/.test(expiresRaw)
            ? parseInt(expiresRaw, 10)
            : (expiresRaw ?? '7d')
        ) as NonNullable<JwtSignOptions['expiresIn']>;

        const opts: JwtModuleOptions = {
          secret,
          signOptions: {
            expiresIn,
          },
        };
        return opts;
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
