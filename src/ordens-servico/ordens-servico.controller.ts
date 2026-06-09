import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateOrdemServicoDto } from './dto/create-ordem-servico.dto';
import { UpdateOrdemServicoDto } from './dto/update-ordem-servico.dto';
import { TipoServico, TIPOS_SERVICO } from '../tipo-servico';
import { OrdemServicoStatus } from './ordem-servico.entity';
import {
  OrdensPdfService,
  type RelatorioFiscalEscopo,
} from './ordens-pdf.service';
import {
  ORDENS_PAGE_SIZE_DEFAULT,
  ORDENS_PAGE_SIZE_MAX,
  OrdensServicoService,
} from './ordens-servico.service';

@Controller('ordens-servico')
export class OrdensServicoController {
  constructor(
    private readonly service: OrdensServicoService,
    private readonly pdfService: OrdensPdfService,
  ) {}

  @Post()
  create(@Body() dto: CreateOrdemServicoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('cliente') cliente?: string,
    @Query('placa') placa?: string,
    @Query('status') status?: string,
    @Query('tipoServico') tipoServico?: string,
    @Query('all') all?: string,
    @Query('page') pageQ?: string,
    @Query('pageSize') pageSizeQ?: string,
    @Query('ordenacao') ordenacao?: string,
  ) {
    const filters = this.parseListFilters(cliente, placa, status, tipoServico);
    const fetchAll = all === '1' || all === 'true';
    if (fetchAll) {
      return this.service.findAll(filters);
    }

    const page = Math.max(1, parseInt(pageQ ?? '1', 10) || 1);
    let pageSize = parseInt(
      pageSizeQ ?? String(ORDENS_PAGE_SIZE_DEFAULT),
      10,
    );
    if (Number.isNaN(pageSize) || pageSize < 1) {
      pageSize = ORDENS_PAGE_SIZE_DEFAULT;
    }
    pageSize = Math.min(pageSize, ORDENS_PAGE_SIZE_MAX);

    const painelTodos =
      !filters.status &&
      (ordenacao === 'painel' || ordenacao === undefined || ordenacao === '');

    return this.service.findAllPaginated(
      filters,
      page,
      pageSize,
      painelTodos,
    );
  }

  private parseListFilters(
    cliente?: string,
    placa?: string,
    status?: string,
    tipoServico?: string,
  ): {
    cliente?: string;
    placa?: string;
    status?: OrdemServicoStatus;
    tipoServico?: TipoServico;
  } {
    let st: OrdemServicoStatus | undefined;
    if (status !== undefined && status !== '') {
      if (
        !Object.values(OrdemServicoStatus).includes(status as OrdemServicoStatus)
      ) {
        throw new BadRequestException(
          'Parâmetro status deve ser: aberto, fazendo ou pronto',
        );
      }
      st = status as OrdemServicoStatus;
    }
    let tipo: TipoServico | undefined;
    if (tipoServico !== undefined && tipoServico !== '') {
      if (!TIPOS_SERVICO.includes(tipoServico as TipoServico)) {
        throw new BadRequestException(
          'Parâmetro tipoServico deve ser: funilaria ou eletrica',
        );
      }
      tipo = tipoServico as TipoServico;
    }
    return { cliente, placa, status: st, tipoServico: tipo };
  }

  @Get('resumo')
  getResumo(
    @Query('cliente') cliente?: string,
    @Query('placa') placa?: string,
    @Query('status') status?: string,
    @Query('tipoServico') tipoServico?: string,
  ) {
    return this.service.getResumo(
      this.parseListFilters(cliente, placa, status, tipoServico),
    );
  }

  @Get('export/pdf')
  async exportPdf(
    @Res({ passthrough: false }) res: Response,
    @Query('ids') ids?: string,
    @Query('cliente') cliente?: string,
    @Query('placa') placa?: string,
    @Query('status') status?: string,
    @Query('tipoServico') tipoServico?: string,
    @Query('modo') modoRaw?: string,
    @Query('escopo') escopoRaw?: string,
    @Query('ano') anoQ?: string,
    @Query('mes') mesQ?: string,
    @Query('formato') formatoRaw?: string,
  ) {
    const modo = (modoRaw ?? '').trim().toLowerCase() || 'lista';

    if (modo === 'fiscal') {
      const escopo = (escopoRaw ?? '').trim().toLowerCase();
      if (!['geral', 'ano', 'mes'].includes(escopo)) {
        throw new BadRequestException(
          'Para modo=fiscal informe escopo=geral, escopo=ano ou escopo=mes.',
        );
      }
      let ano: number | undefined;
      let mes: number | undefined;
      if (escopo === 'ano' || escopo === 'mes') {
        if (!anoQ?.trim()) {
          throw new BadRequestException('Informe o parâmetro ano (AAAA).');
        }
        ano = parseInt(anoQ.trim(), 10);
        if (Number.isNaN(ano) || ano < 2000 || ano > 2100) {
          throw new BadRequestException('Parâmetro ano inválido (use AAAA).');
        }
      }
      if (escopo === 'mes') {
        if (!mesQ?.trim()) {
          throw new BadRequestException('Informe o parâmetro mes (1 a 12).');
        }
        mes = parseInt(mesQ.trim(), 10);
        if (Number.isNaN(mes) || mes < 1 || mes > 12) {
          throw new BadRequestException('Parâmetro mes inválido (1 a 12).');
        }
      }
      const formato = (formatoRaw ?? 'pdf').trim().toLowerCase();
      if (formato !== 'pdf' && formato !== 'xlsx') {
        throw new BadRequestException('formato deve ser pdf ou xlsx');
      }

      const fiscalOpts = {
        escopo: escopo as RelatorioFiscalEscopo,
        ano,
        mes,
      };
      const baseName =
        escopo === 'geral'
          ? 'relatorio-fiscal-geral'
          : escopo === 'ano'
            ? `relatorio-fiscal-${ano}`
            : `relatorio-fiscal-${ano}-${String(mes!).padStart(2, '0')}`;

      if (formato === 'xlsx') {
        const buf = await this.pdfService.excelRelatorioFiscal(fiscalOpts);
        res.set({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
        });
        res.send(buf);
        return;
      }

      const buf = await this.pdfService.pdfRelatorioFiscal(fiscalOpts);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
      });
      res.send(buf);
      return;
    }

    let idList: number[] | undefined;
    if (ids?.trim()) {
      idList = ids
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => !Number.isNaN(n));
    }
    let st: OrdemServicoStatus | undefined;
    if (status !== undefined && status !== '') {
      if (
        !Object.values(OrdemServicoStatus).includes(status as OrdemServicoStatus)
      ) {
        throw new BadRequestException(
          'Parâmetro status deve ser: aberto, fazendo ou pronto',
        );
      }
      st = status as OrdemServicoStatus;
    }
    let tipo: TipoServico | undefined;
    if (!idList?.length && tipoServico?.trim()) {
      if (!TIPOS_SERVICO.includes(tipoServico.trim() as TipoServico)) {
        throw new BadRequestException(
          'Parâmetro tipoServico deve ser: funilaria ou eletrica',
        );
      }
      tipo = tipoServico.trim() as TipoServico;
    }
    const buf = await this.pdfService.pdfLista({
      ids: idList,
      cliente: idList?.length ? undefined : cliente,
      placa: idList?.length ? undefined : placa,
      status: idList?.length ? undefined : st,
      tipoServico: idList?.length ? undefined : tipo,
    });
    const name = idList?.length
      ? 'ordens-selecionadas.pdf'
      : st
        ? `ordens-${st}.pdf`
        : 'ordens-relatorio.pdf';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
    });
    res.send(buf);
  }

  @Get(':id/pdf')
  async pdfAssinatura(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buf = await this.pdfService.pdfOrdemUnica(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="os-${id}-assinatura.pdf"`,
    });
    res.send(buf);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdemServicoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
