import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AgendamentoStatus } from '../agendamento.entity';

export class CreateAgendamentoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  cliente: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  contato: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  placa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  modelo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  ano?: number | null;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dia: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observacoes?: string;

  @IsOptional()
  @IsEnum(AgendamentoStatus)
  status?: AgendamentoStatus;
}
