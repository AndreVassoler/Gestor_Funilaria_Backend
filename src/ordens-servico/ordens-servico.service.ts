import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateOrdemServicoDto } from './dto/create-ordem-servico.dto';
import { validarPecasReparoParaCotacao } from './pecas-reparo-precos';
import { UpdateOrdemServicoDto } from './dto/update-ordem-servico.dto';
import { OrdemServico, OrdemServicoStatus } from './ordem-servico.entity';

export type ListOrdensFilters = {
  cliente?: string;
  placa?: string;
  status?: OrdemServicoStatus;
};

export const ORDENS_PAGE_SIZE_DEFAULT = 24;
export const ORDENS_PAGE_SIZE_MAX = 100;

export type OrdensPaginatedResult = {
  items: OrdemServico[];
  total: number;
  page: number;
  pageSize: number;
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
    let pecas: string[];
    try {
      pecas = validarPecasReparoParaCotacao(dto.pecasReparo);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'PEÇAS_OBRIGATÓRIAS') {
        throw new BadRequestException(
          'Selecione ao menos uma peça para cotar o serviço.',
        );
      }
      if (code === 'PEÇAS_INVALIDAS') {
        throw new BadRequestException('Peça de reparo inválida na cotação.');
      }
      throw e;
    }
    const { dataAbertura, previsaoEntrega, ...rest } = dto;
    const status = dto.status ?? OrdemServicoStatus.ABERTO;
    const entity = this.repo.create({
      ...rest,
      pecasReparo: dto.pecasReparo.trim(),
      status,
      dataAbertura: dataAbertura ? new Date(dataAbertura) : new Date(),
      previsaoEntrega: previsaoEntrega ? new Date(previsaoEntrega) : null,
      dataConclusao:
        status === OrdemServicoStatus.PRONTO ? new Date() : null,
    });
    return this.repo.save(entity);
  }

  private createListQueryBuilder(
    filters?: ListOrdensFilters,
    painelTodos = false,
  ): SelectQueryBuilder<OrdemServico> {
    const qb = this.repo.createQueryBuilder('o');
    this.applyListFilters(qb, filters);

    if (painelTodos) {
      qb.orderBy(
        `CASE o.status WHEN :stFazendo THEN 0 WHEN :stAberto THEN 1 WHEN :stPronto THEN 2 ELSE 3 END`,
        'ASC',
      )
        .setParameters({
          stFazendo: OrdemServicoStatus.FAZENDO,
          stAberto: OrdemServicoStatus.ABERTO,
          stPronto: OrdemServicoStatus.PRONTO,
        })
        .addOrderBy('o.previsaoEntrega IS NULL', 'ASC')
        .addOrderBy('o.previsaoEntrega', 'ASC')
        .addOrderBy('o.id', 'DESC');
    } else {
      qb.orderBy('o.previsaoEntrega IS NULL', 'ASC')
        .addOrderBy('o.previsaoEntrega', 'ASC')
        .addOrderBy('o.id', 'DESC');
    }

    return qb;
  }

  findAll(filters?: ListOrdensFilters): Promise<OrdemServico[]> {
    const painelTodos = !filters?.status;
    return this.createListQueryBuilder(filters, painelTodos).getMany();
  }

  async findAllPaginated(
    filters: ListOrdensFilters | undefined,
    page: number,
    pageSize: number,
    painelTodos: boolean,
  ): Promise<OrdensPaginatedResult> {
    const qb = this.createListQueryBuilder(filters, painelTodos);
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { items, total, page, pageSize };
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
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const qb = this.repo.createQueryBuilder('o');
    this.applyListFilters(qb, filters);
    qb.select(
      `COUNT(*) FILTER (WHERE o.status = :abertoSt)`,
      'abertas',
    )
      .addSelect(
        `COUNT(*) FILTER (WHERE o.status = :fazendoSt)`,
        'em_andamento',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE o.status = :prontoSt)`,
        'prontas',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE o.previsaoEntrega IS NOT NULL AND o.previsaoEntrega < :hoje AND o.status != :prontoSt)`,
        'atrasadas',
      )
      .addSelect('COUNT(*)', 'total_ordens')
      .addSelect(
        `COALESCE(SUM(o.valor) FILTER (WHERE o.status = :prontoSt), 0)`,
        'valor_arrecadado_prontos',
      )
      .addSelect(
        `COALESCE(SUM(o.valor) FILTER (WHERE o.status IN (:...carteiraSts)), 0)`,
        'valor_em_aberto_e_andamento',
      )
      .setParameters({
        abertoSt: OrdemServicoStatus.ABERTO,
        fazendoSt: OrdemServicoStatus.FAZENDO,
        prontoSt: OrdemServicoStatus.PRONTO,
        hoje: hoje.toISOString(),
        carteiraSts: [
          OrdemServicoStatus.ABERTO,
          OrdemServicoStatus.FAZENDO,
        ],
      });

    const row = await qb.getRawOne<{
      abertas: string | number;
      em_andamento: string | number;
      prontas: string | number;
      atrasadas: string | number;
      total_ordens: string | number;
      valor_arrecadado_prontos: string | number;
      valor_em_aberto_e_andamento: string | number;
    }>();

    return {
      abertas: Number(row?.abertas ?? 0),
      emAndamento: Number(row?.em_andamento ?? 0),
      prontas: Number(row?.prontas ?? 0),
      atrasadas: Number(row?.atrasadas ?? 0),
      totalOrdens: Number(row?.total_ordens ?? 0),
      valorArrecadadoProntos: Number(row?.valor_arrecadado_prontos ?? 0),
      valorEmAbertoEAndamento: Number(row?.valor_em_aberto_e_andamento ?? 0),
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
    if (dto.pecasReparo !== undefined) row.pecasReparo = dto.pecasReparo;
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
  }
}
