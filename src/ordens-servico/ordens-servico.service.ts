import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateOrdemServicoDto } from './dto/create-ordem-servico.dto';
import { UpdateOrdemServicoDto } from './dto/update-ordem-servico.dto';
import { OrdemServico, OrdemServicoStatus } from './ordem-servico.entity';

export type ListOrdensFilters = {
  cliente?: string;
  placa?: string;
  status?: OrdemServicoStatus;
};

@Injectable()
export class OrdensServicoService {
  constructor(
    @InjectRepository(OrdemServico)
    private readonly repo: Repository<OrdemServico>,
  ) {}

  private applyListFilters(
    qb: SelectQueryBuilder<OrdemServico>,
    filters?: ListOrdensFilters,
  ): void {
    if (filters?.cliente?.trim()) {
      qb.andWhere('LOWER(o.cliente) LIKE LOWER(:cliente)', {
        cliente: `%${filters.cliente.trim()}%`,
      });
    }
    if (filters?.placa?.trim()) {
      const p = filters.placa.trim().replace(/[^a-zA-Z0-9]/g, '');
      if (p) {
        qb.andWhere('LOWER(o.placa) LIKE LOWER(:placa)', {
          placa: `%${p}%`,
        });
      }
    }
    if (filters?.status) {
      qb.andWhere('o.status = :status', { status: filters.status });
    }
  }

  create(dto: CreateOrdemServicoDto): Promise<OrdemServico> {
    const { dataAbertura, previsaoEntrega, ...rest } = dto;
    const status = dto.status ?? OrdemServicoStatus.ABERTO;
    const entity = this.repo.create({
      ...rest,
      status,
      dataAbertura: dataAbertura ? new Date(dataAbertura) : new Date(),
      previsaoEntrega: previsaoEntrega ? new Date(previsaoEntrega) : null,
      dataConclusao:
        status === OrdemServicoStatus.PRONTO ? new Date() : null,
    });
    return this.repo.save(entity);
  }

  findAll(filters?: ListOrdensFilters): Promise<OrdemServico[]> {
    const qb = this.repo.createQueryBuilder('o');
    this.applyListFilters(qb, filters);

    qb.orderBy('o.previsaoEntrega IS NULL', 'ASC')
      .addOrderBy('o.previsaoEntrega', 'ASC')
      .addOrderBy('o.id', 'DESC');

    return qb.getMany();
  }

  private async countComFiltro(
    filters: ListOrdensFilters | undefined,
    status: OrdemServicoStatus,
  ): Promise<number> {
    const qb = this.repo.createQueryBuilder('o');
    this.applyListFilters(qb, filters);
    qb.andWhere('o.status = :st', { st: status });
    return qb.getCount();
  }

  private async sumValorComFiltro(
    filters: ListOrdensFilters | undefined,
    status: OrdemServicoStatus,
  ): Promise<number> {
    const qb = this.repo.createQueryBuilder('o');
    this.applyListFilters(qb, filters);
    qb
      .select('COALESCE(SUM(o.valor), 0)', 'sum')
      .andWhere('o.status = :st', { st: status });
    const row = await qb.getRawOne<{ sum: string | number }>();
    return Number(row?.sum ?? 0);
  }

  private async sumValorCarteiraComFiltro(
    filters: ListOrdensFilters | undefined,
  ): Promise<number> {
    const qb = this.repo.createQueryBuilder('o');
    this.applyListFilters(qb, filters);
    qb
      .select('COALESCE(SUM(o.valor), 0)', 'sum')
      .andWhere('o.status IN (:...sts)', {
        sts: [OrdemServicoStatus.ABERTO, OrdemServicoStatus.FAZENDO],
      });
    const row = await qb.getRawOne<{ sum: string | number }>();
    return Number(row?.sum ?? 0);
  }

  async getResumo(filters?: ListOrdensFilters): Promise<{
    abertas: number;
    emAndamento: number;
    prontas: number;
    atrasadas: number;
    totalOrdens: number;
    valorArrecadadoProntos: number;
    valorEmAbertoEAndamento: number;
  }> {
    const abertas = await this.countComFiltro(
      filters,
      OrdemServicoStatus.ABERTO,
    );
    const emAndamento = await this.countComFiltro(
      filters,
      OrdemServicoStatus.FAZENDO,
    );
    const prontas = await this.countComFiltro(
      filters,
      OrdemServicoStatus.PRONTO,
    );

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const qbAtr = this.repo.createQueryBuilder('o');
    this.applyListFilters(qbAtr, filters);
    const atrasadas = await qbAtr
      .andWhere('o.previsaoEntrega IS NOT NULL')
      .andWhere('o.previsaoEntrega < :hoje', { hoje: hoje.toISOString() })
      .andWhere('o.status != :pronto', { pronto: OrdemServicoStatus.PRONTO })
      .getCount();

    const qbTotal = this.repo.createQueryBuilder('o');
    this.applyListFilters(qbTotal, filters);
    const totalOrdens = await qbTotal.getCount();

    const valorArrecadadoProntos = await this.sumValorComFiltro(
      filters,
      OrdemServicoStatus.PRONTO,
    );
    const valorEmAbertoEAndamento =
      await this.sumValorCarteiraComFiltro(filters);

    return {
      abertas,
      emAndamento,
      prontas,
      atrasadas,
      totalOrdens,
      valorArrecadadoProntos,
      valorEmAbertoEAndamento,
    };
  }

  async findOne(id: number): Promise<OrdemServico> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Ordem de serviço #${id} não encontrada`);
    }
    return row;
  }

  async update(id: number, dto: UpdateOrdemServicoDto): Promise<OrdemServico> {
    const row = await this.findOne(id);

    if (dto.cliente !== undefined) row.cliente = dto.cliente;
    if (dto.contato !== undefined) row.contato = dto.contato;
    if (dto.marca !== undefined) row.marca = dto.marca;
    if (dto.modelo !== undefined) row.modelo = dto.modelo;
    if (dto.ano !== undefined) row.ano = dto.ano;
    if (dto.placa !== undefined) row.placa = dto.placa;
    if (dto.descricao !== undefined) row.descricao = dto.descricao;
    if (dto.valor !== undefined) row.valor = dto.valor;
    if (dto.status !== undefined) {
      if (
        row.status === OrdemServicoStatus.PRONTO &&
        dto.status !== OrdemServicoStatus.PRONTO
      ) {
        throw new BadRequestException(
          'Ordem concluída não pode ser reaberta.',
        );
      }
      row.status = dto.status;
    }

    if (dto.dataConclusao !== undefined) {
      row.dataConclusao =
        dto.dataConclusao === null || dto.dataConclusao === ''
          ? null
          : new Date(dto.dataConclusao);
    }

    if (
      row.status === OrdemServicoStatus.PRONTO &&
      !row.dataConclusao &&
      dto.dataConclusao === undefined
    ) {
      row.dataConclusao = new Date();
    }

    if (
      dto.dataAbertura !== undefined &&
      dto.dataAbertura !== null &&
      dto.dataAbertura !== ''
    ) {
      row.dataAbertura = new Date(dto.dataAbertura);
    }
    if (dto.previsaoEntrega !== undefined) {
      row.previsaoEntrega =
        dto.previsaoEntrega === null || dto.previsaoEntrega === ''
          ? null
          : new Date(dto.previsaoEntrega);
    }

    return this.repo.save(row);
  }

  async remove(id: number): Promise<void> {
    const row = await this.findOne(id);
    await this.repo.remove(row);
    const dir = join(process.cwd(), 'uploads', 'ordens', String(id));
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}
