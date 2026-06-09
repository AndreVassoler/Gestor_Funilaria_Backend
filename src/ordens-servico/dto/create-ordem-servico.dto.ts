import { Type } from 'class-transformer';
import {
  Allow,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TipoServico } from '../../tipo-servico';
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

  @IsEnum(TipoServico)
  tipoServico: TipoServico;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  itensChecklist: string;

  @IsString()
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
