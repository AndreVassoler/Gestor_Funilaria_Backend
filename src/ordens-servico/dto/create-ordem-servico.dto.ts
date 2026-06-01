import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { OrdemServicoStatus } from '../ordem-servico.entity';

export class CreateOrdemServicoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  cliente: string;

  @IsString()
  @IsNotEmpty()
  contato: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  marca: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  modelo: string;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  ano: number;

  @IsString()
  @IsNotEmpty()
  placa: string;

  @IsString()
  @IsNotEmpty()
  descricao: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor: number;

  @IsOptional()
  @IsEnum(OrdemServicoStatus)
  status?: OrdemServicoStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsDateString()
  dataAbertura?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsDateString()
  previsaoEntrega?: string;
}
