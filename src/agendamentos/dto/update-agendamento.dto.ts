import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AgendamentoStatus } from '../agendamento.entity';

export class UpdateAgendamentoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  cliente?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  contato?: string;

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
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  ano?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observacoes?: string;

  @IsOptional()
  @IsEnum(AgendamentoStatus)
  status?: AgendamentoStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ordemId?: number | null;
}
