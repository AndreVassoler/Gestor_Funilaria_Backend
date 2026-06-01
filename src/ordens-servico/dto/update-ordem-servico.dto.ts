import { Type } from 'class-transformer';
import {
  Allow,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { OrdemServicoStatus } from '../ordem-servico.entity';

export class UpdateOrdemServicoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  cliente?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  contato?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  marca?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  modelo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  ano?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  placa?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  descricao?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor?: number;

  @IsOptional()
  @IsEnum(OrdemServicoStatus)
  status?: OrdemServicoStatus;

  @IsOptional()
  @IsDateString()
  dataAbertura?: string;

  @IsOptional()
  @Allow()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsDateString()
  previsaoEntrega?: string | null;

  @IsOptional()
  @Allow()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsDateString()
  dataConclusao?: string | null;
}
