import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { Agendamento, AgendamentoStatus } from './agendamento.entity';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

@Injectable()
export class AgendamentosService {
  constructor(
    @InjectRepository(Agendamento)
    private readonly repo: Repository<Agendamento>,
    private readonly googleCalendar: GoogleCalendarService,
  ) {}

  private normalizarDia(raw: string): string {
    const t = raw.trim().slice(0, 10);
    const m = YMD.exec(t);
    if (!m) {
      throw new BadRequestException('Use a data no formato AAAA-MM-DD.');
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
    if (
      Number.isNaN(dt.getTime()) ||
      dt.getFullYear() !== y ||
      dt.getMonth() !== mo - 1 ||
      dt.getDate() !== d
    ) {
      throw new BadRequestException('Data inválida.');
    }
    return t;
  }

  async create(dto: CreateAgendamentoDto): Promise<Agendamento> {
    const dia = this.normalizarDia(dto.dia);

    const row = this.repo.create({
      cliente: dto.cliente.trim(),
      contato: dto.contato.trim(),
      placa: (dto.placa ?? '').trim(),
      marca: (dto.marca ?? '').trim(),
      modelo: (dto.modelo ?? '').trim(),
      ano: dto.ano ?? null,
      dia,
      observacoes: (dto.observacoes ?? '').trim(),
      status: dto.status ?? AgendamentoStatus.AGENDADO,
      ordemId: null,
      googleEventId: null,
    });
    let saved = await this.repo.save(row);
    const withEvent = await this.googleCalendar.syncOnCreate(saved);
    if (withEvent.googleEventId) {
      await this.repo.update(
        { id: saved.id },
        { googleEventId: withEvent.googleEventId },
      );
      saved = await this.findOne(saved.id);
    }
    return saved;
  }

  async findByRange(deRaw: string, ateRaw: string): Promise<Agendamento[]> {
    const deS = this.normalizarDia(deRaw);
    const ateS = this.normalizarDia(ateRaw);
    if (deS > ateS) {
      throw new BadRequestException('Data inicial não pode ser posterior à final.');
    }

    return this.repo
      .createQueryBuilder('a')
      .where('a.dia >= :de AND a.dia <= :ate', { de: deS, ate: ateS })
      .orderBy('a.dia', 'ASC')
      .addOrderBy('a.id', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Agendamento> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Agendamento #${id} não encontrado`);
    }
    return row;
  }

  async update(id: number, dto: UpdateAgendamentoDto): Promise<Agendamento> {
    const row = await this.findOne(id);

    if (dto.cliente !== undefined) row.cliente = dto.cliente.trim();
    if (dto.contato !== undefined) row.contato = dto.contato.trim();
    if (dto.placa !== undefined) row.placa = dto.placa.trim();
    if (dto.marca !== undefined) row.marca = dto.marca.trim();
    if (dto.modelo !== undefined) row.modelo = dto.modelo.trim();
    if (dto.ano !== undefined) row.ano = dto.ano;
    if (dto.observacoes !== undefined) row.observacoes = dto.observacoes.trim();
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.ordemId !== undefined) row.ordemId = dto.ordemId;

    if (dto.dia !== undefined) {
      row.dia = this.normalizarDia(dto.dia);
    }

    const saved = await this.repo.save(row);
    await this.googleCalendar.syncOnUpdate(saved);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const row = await this.findOne(id);
    const gid = row.googleEventId;
    await this.repo.remove(row);
    await this.googleCalendar.syncOnDelete(gid);
  }
}
