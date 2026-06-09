import { Type } from 'class-transformer';
import {
  Allow,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TipoServico } from '../../tipo-servico';
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
  @Allow()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @Type(() => Number)
  ano?: number | null;

  @IsOptional()
  @IsString()
  placa?: string;

  @IsOptional()
  @IsBoolean()
  implementoAgricola?: boolean;

  @IsOptional()
  @IsEnum(TipoServico)
  tipoServico?: TipoServico;

  @IsOptional()
  @IsString()
  @MinLength(1)
  itensChecklist?: string;

  @IsOptional()
  @IsString()
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
