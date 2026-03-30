import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1, { message: 'Informe o usuário.' })
  username: string;

  @IsString()
  @MinLength(1, { message: 'Informe a senha.' })
  password: string;
}
