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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CreateOrdemServicoDto } from './dto/create-ordem-servico.dto';
import { UpdateOrdemServicoDto } from './dto/update-ordem-servico.dto';
import { fotosMulterOptions } from './fotos-multer.config';
import { OrdemFotoService } from './ordem-foto.service';
import { OrdemServicoStatus } from './ordem-servico.entity';
import {
  OrdensPdfService,
  type RelatorioFiscalEscopo,
} from './ordens-pdf.service';
import { OrdensServicoService } from './ordens-servico.service';

@Controller('ordens-servico')
export class OrdensServicoController {
  constructor(
    private readonly service: OrdensServicoService,
    private readonly fotoService: OrdemFotoService,
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
  ) {
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
    return this.service.findAll({ cliente, placa, status: st });
  }

  @Get('resumo')
  getResumo(
    @Query('cliente') cliente?: string,
    @Query('placa') placa?: string,
    @Query('status') status?: string,
  ) {
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
    return this.service.getResumo({ cliente, placa, status: st });
  }

  @Get('export/pdf')
  async exportPdf(
    @Res({ passthrough: false }) res: Response,
    @Query('ids') ids?: string,
    @Query('cliente') cliente?: string,
    @Query('placa') placa?: string,
    @Query('status') status?: string,
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
    const buf = await this.pdfService.pdfLista({
      ids: idList,
      cliente: idList?.length ? undefined : cliente,
      placa: idList?.length ? undefined : placa,
      status: idList?.length ? undefined : st,
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

  @Get(':id/fotos')
  listFotos(@Param('id', ParseIntPipe) id: number) {
    return this.fotoService.list(id);
  }

  @Post(':id/fotos')
  @UseInterceptors(FileInterceptor('arquivo', fotosMulterOptions()))
  async uploadFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('tipo') tipo: string,
  ) {
    if (!file) {
      throw new BadRequestException('Envie um arquivo no campo "arquivo".');
    }
    return this.fotoService.add(id, tipo, file);
  }

  @Delete(':id/fotos/:fotoId')
  deleteFoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('fotoId', ParseIntPipe) fotoId: number,
  ) {
    return this.fotoService.remove(id, fotoId);
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
