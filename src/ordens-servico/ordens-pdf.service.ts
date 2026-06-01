import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { FUNILARIA_NOME } from '../brand';
import { OrdemServicoFoto } from './ordem-servico-foto.entity';
import { OrdemServico, OrdemServicoStatus } from './ordem-servico.entity';

function fmtBrl(n: number) {
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function fmtData(d: Date | null | undefined) {
  if (!d) return '—';
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  const utcMid =
    x.getUTCHours() === 0 &&
    x.getUTCMinutes() === 0 &&
    x.getUTCSeconds() === 0 &&
    x.getUTCMilliseconds() === 0;
  if (utcMid) {
    const dd = String(x.getUTCDate()).padStart(2, '0');
    const mm = String(x.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = String(x.getUTCFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(x);
}

function fmtDataHoraBr(now: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
}

function statusLabel(s: OrdemServicoStatus) {
  const m: Record<OrdemServicoStatus, string> = {
    [OrdemServicoStatus.ABERTO]: 'Aberto',
    [OrdemServicoStatus.FAZENDO]: 'Em andamento',
    [OrdemServicoStatus.PRONTO]: 'Pronto',
  };
  return m[s] ?? s;
}

/** Paleta alinhada ao visual do app (índigo / slate). */
const PDF_THEME = {
  bannerBg: '#3730a3',
  bannerAccent: '#a5b4fc',
  body: '#0f172a',
  muted: '#64748b',
  cardBg: '#f1f5f9',
  tableHeaderBg: '#4f46e5',
  tableHeaderText: '#ffffff',
  tableStripe: '#f8fafc',
  border: '#cbd5e1',
  white: '#ffffff',
} as const;

const PDF_PAGE_W = 595.28;
const PDF_BANNER_H = 78;

export type RelatorioFiscalEscopo = 'geral' | 'ano' | 'mes';

export type RelatorioFiscalOpts = {
  escopo: RelatorioFiscalEscopo;
  ano?: number;
  mes?: number;
};

type RelatorioFiscalDados = {
  rows: OrdemServico[];
  receita: { sum: number; count: number };
  abertos: number;
  fazendo: number;
  prontos: number;
  carteiraListada: number;
  ticketMedio: number | null;
  totalValoresDemonstrativo: number;
};

@Injectable()
export class OrdensPdfService {
  constructor(
    @InjectRepository(OrdemServico)
    private readonly ordemRepo: Repository<OrdemServico>,
    @InjectRepository(OrdemServicoFoto)
    private readonly fotoRepo: Repository<OrdemServicoFoto>,
  ) {}

  private uploadsRoot() {
    return path.join(process.cwd(), 'uploads');
  }

  /**
   * Cabeçalho visual (faixa índigo) — primeira página dos relatórios.
   */
  private drawPdfPageBanner(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc: any,
    title: string,
    subtitleLines: string[],
  ) {
    const w = PDF_PAGE_W;
    doc.save();
    doc.rect(0, 0, w, PDF_BANNER_H).fill(PDF_THEME.bannerBg);
    doc
      .strokeColor(PDF_THEME.bannerAccent)
      .lineWidth(2.5)
      .moveTo(0, PDF_BANNER_H)
      .lineTo(w, PDF_BANNER_H)
      .stroke();
    doc.fillColor(PDF_THEME.white).font('Helvetica-Bold').fontSize(17);
    doc.text(title, 0, 24, { width: w, align: 'center' });
    doc.font('Helvetica').fontSize(9.5);
    let subY = 46;
    for (const line of subtitleLines) {
      doc.text(line, 48, subY, { width: w - 96, align: 'center' });
      subY += 12;
    }
    doc.restore();
    doc.fillColor(PDF_THEME.body);
    doc.y = PDF_BANNER_H + 16;
    doc.x = 50;
  }

  /** Faixa compacta em páginas seguintes (lista de várias OS). */
  private drawPdfContinuationStrip(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc: any,
    line: string,
  ) {
    const w = PDF_PAGE_W;
    const h = 34;
    doc.save();
    doc.rect(0, 0, w, h).fill('#e0e7ff');
    doc.fillColor('#312e81').font('Helvetica-Bold').fontSize(9.5);
    doc.text(line, 0, 11, { width: w, align: 'center' });
    doc.restore();
    doc.fillColor(PDF_THEME.body);
    doc.y = h + 14;
    doc.x = 50;
  }

  private async loadFotos(ordemId: number) {
    return this.fotoRepo.find({
      where: { ordemId },
      order: { id: 'ASC' },
    });
  }

  private drawOrdemPage(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc: any,
    o: OrdemServico,
    fotos: OrdemServicoFoto[],
    opts: { assinatura: boolean; titulo?: string },
  ) {
    const left = 50;
    const contentW = 495;

    const lineKV = (label: string, val: string) => {
      doc
        .fillColor(PDF_THEME.muted)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(label, { continued: true, lineBreak: false });
      doc
        .fillColor(PDF_THEME.body)
        .font('Helvetica')
        .fontSize(10)
        .text(val, { width: contentW });
    };

    if (opts.titulo) {
      doc
        .fillColor(PDF_THEME.bannerBg)
        .font('Helvetica-Bold')
        .fontSize(12.5)
        .text(opts.titulo, left, doc.y, { width: contentW });
      doc.moveDown(0.4);
      doc
        .strokeColor(PDF_THEME.border)
        .lineWidth(0.75)
        .moveTo(left, doc.y)
        .lineTo(left + contentW, doc.y)
        .stroke();
      doc.moveDown(0.5);
    }

    const yCard = doc.y;
    const cardH = 118;
    doc.save();
    doc
      .fillColor(PDF_THEME.cardBg)
      .rect(left - 2, yCard, contentW + 4, cardH)
      .fill();
    doc.strokeColor(PDF_THEME.border).lineWidth(0.4);
    doc.roundedRect(left - 2, yCard, contentW + 4, cardH, 4).stroke();
    doc.restore();

    doc.x = left;
    doc.y = yCard + 8;
    doc
      .fillColor(PDF_THEME.body)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`Ordem de serviço #${o.id}`, { width: contentW });
    doc.moveDown(0.35);
    lineKV('Cliente: ', o.cliente);
    lineKV('Contato: ', o.contato);
    lineKV(
      'Veículo: ',
      `${o.marca} ${o.modelo} (${o.ano}) — Placa: ${o.placa}`,
    );
    lineKV('Status: ', statusLabel(o.status));
    lineKV('Abertura: ', fmtData(o.dataAbertura));
    lineKV('Conclusão: ', fmtData(o.dataConclusao));
    lineKV('Previsão entrega: ', fmtData(o.previsaoEntrega));
    lineKV('Valor estimado: ', fmtBrl(o.valor));
    doc.y = yCard + cardH + 10;
    doc.x = left;

    doc
      .fillColor(PDF_THEME.bannerBg)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Descrição do serviço', left, doc.y, { width: contentW });
    doc.moveDown(0.35);
    doc
      .fillColor(PDF_THEME.body)
      .font('Helvetica')
      .fontSize(10)
      .text(o.descricao || '—', { width: contentW });
    doc.moveDown();

    const antes = fotos.filter((f) => f.tipo === 'antes');
    const depois = fotos.filter((f) => f.tipo === 'depois');
    doc
      .fillColor(PDF_THEME.muted)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Anexos: ${antes.length} foto(s) antes · ${depois.length} depois`,
        { width: contentW },
      );

    const addImgs = (label: string, list: OrdemServicoFoto[]) => {
      if (!list.length) return;
      doc.moveDown(0.35);
      doc
        .fillColor(PDF_THEME.tableHeaderBg)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`${label}`, { width: contentW });
      doc.fillColor(PDF_THEME.body).font('Helvetica').fontSize(9);
      for (const f of list.slice(0, 3)) {
        const full = path.join(this.uploadsRoot(), f.arquivo);
        if (fs.existsSync(full)) {
          try {
            doc.moveDown(0.2);
            doc.image(full, { width: 220, align: 'left' });
          } catch {
            doc.text(`(imagem indisponível: ${f.arquivo})`);
          }
        }
      }
      if (list.length > 3) {
        doc.text(`… e mais ${list.length - 3} foto(s).`);
      }
    };
    addImgs('Antes', antes);
    addImgs('Depois', depois);

    if (opts.assinatura) {
      doc.moveDown(1.5);
      const yDecl = doc.y;
      doc
        .fillColor(PDF_THEME.cardBg)
        .rect(left - 2, yDecl, contentW + 4, 56)
        .fill();
      doc.strokeColor(PDF_THEME.border).lineWidth(0.4);
      doc.roundedRect(left - 2, yDecl, contentW + 4, 56, 3).stroke();
      doc.y = yDecl + 8;
      doc.x = left;
      doc
        .fillColor(PDF_THEME.body)
        .font('Helvetica')
        .fontSize(10)
        .text(
          'Declaro estar ciente das condições do serviço e do valor acima.',
          { width: contentW },
        );
      doc.moveDown(2);
      doc.text('_'.repeat(52));
      doc.fontSize(8).fillColor(PDF_THEME.muted).text('Assinatura do cliente');
      doc.moveDown(1.2);
      doc.fillColor(PDF_THEME.body).fontSize(10).text('_'.repeat(52));
      doc
        .fontSize(8)
        .fillColor(PDF_THEME.muted)
        .text('Assinatura da oficina / responsável');
      doc.fillColor(PDF_THEME.body);
    }
  }

  async pdfOrdemUnica(id: number): Promise<Buffer> {
    const o = await this.ordemRepo.findOne({ where: { id } });
    if (!o) throw new NotFoundException(`Ordem #${id} não encontrada`);
    const fotos = await this.loadFotos(id);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      this.drawPdfPageBanner(doc, `Ordem de serviço — ${FUNILARIA_NOME}`, [
        `Documento para assinatura · ${fmtDataHoraBr(new Date())}`,
      ]);
      this.drawOrdemPage(doc, o, fotos, { assinatura: true });
      doc.end();
    });
  }

  async pdfLista(opts: {
    ids?: number[];
    cliente?: string;
    placa?: string;
    status?: OrdemServicoStatus;
  }): Promise<Buffer> {
    let rows: OrdemServico[];

    if (opts.ids?.length) {
      rows = await this.ordemRepo.find({
        where: { id: In(opts.ids) },
        order: { id: 'DESC' },
      });
    } else {
      const qb = this.ordemRepo.createQueryBuilder('o');
      if (opts.cliente?.trim()) {
        qb.andWhere('LOWER(o.cliente) LIKE LOWER(:cliente)', {
          cliente: `%${opts.cliente.trim()}%`,
        });
      }
      if (opts.placa?.trim()) {
        const p = opts.placa.trim().replace(/[^a-zA-Z0-9]/g, '');
        if (p) {
          qb.andWhere('LOWER(o.placa) LIKE LOWER(:placa)', {
            placa: `%${p}%`,
          });
        }
      }
      if (opts.status) {
        qb.andWhere('o.status = :status', { status: opts.status });
      }
      qb.orderBy('o.previsaoEntrega IS NULL', 'ASC')
        .addOrderBy('o.previsaoEntrega', 'ASC')
        .addOrderBy('o.id', 'DESC');
      rows = await qb.getMany();
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawPdfPageBanner(doc, `Relatório operacional — ${FUNILARIA_NOME}`, [
        'Lista detalhada por ordem de serviço',
        `Gerado em ${fmtDataHoraBr(new Date())}`,
      ]);

      if (!rows.length) {
        doc
          .fillColor(PDF_THEME.body)
          .fontSize(11)
          .font('Helvetica')
          .text('Nenhuma ordem encontrada com os critérios.');
        doc.end();
        return;
      }

      let first = true;
      const run = async () => {
        try {
          for (const o of rows) {
            if (!first) {
              doc.addPage();
              this.drawPdfContinuationStrip(
                doc,
                `${FUNILARIA_NOME} · Relatório operacional (continuação)`,
              );
            }
            first = false;
            const fotos = await this.loadFotos(o.id);
            this.drawOrdemPage(doc, o, fotos, {
              assinatura: false,
              titulo: `OS #${o.id}`,
            });
          }
          doc.end();
        } catch (e) {
          reject(e);
        }
      };
      void run();
    });
  }

  private addPeriodoAtividade(
    qb: SelectQueryBuilder<OrdemServico>,
    escopo: RelatorioFiscalEscopo,
    ano?: number,
    mes?: number,
  ) {
    if (escopo === 'geral') return;
    if (escopo === 'ano' && ano != null) {
      qb.andWhere(
        `(EXTRACT(YEAR FROM o.dataAbertura) = :fAno OR (o.dataConclusao IS NOT NULL AND EXTRACT(YEAR FROM o.dataConclusao) = :fAno))`,
        { fAno: ano },
      );
      return;
    }
    if (escopo === 'mes' && ano != null && mes != null) {
      const ym = `${ano}-${String(mes).padStart(2, '0')}`;
      qb.andWhere(
        `(TO_CHAR(o.dataAbertura, 'YYYY-MM') = :fYm OR (o.dataConclusao IS NOT NULL AND TO_CHAR(o.dataConclusao, 'YYYY-MM') = :fYm))`,
        { fYm: ym },
      );
    }
  }

  private async fetchOrdensRelatorioFiscal(
    opts: RelatorioFiscalOpts,
  ): Promise<OrdemServico[]> {
    const qb = this.ordemRepo.createQueryBuilder('o');
    this.addPeriodoAtividade(qb, opts.escopo, opts.ano, opts.mes);
    qb.orderBy('o.id', 'DESC');
    return qb.getMany();
  }

  private async sumReceitaServicosConcluidos(
    opts: RelatorioFiscalOpts,
  ): Promise<{ sum: number; count: number }> {
    const qb = this.ordemRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.valor), 0)', 'sum')
      .addSelect('COUNT(*)', 'cnt')
      .where('o.status = :pronto', { pronto: OrdemServicoStatus.PRONTO });

    if (opts.escopo === 'ano' && opts.ano != null) {
      qb.andWhere(
        `EXTRACT(YEAR FROM COALESCE(o.dataConclusao, o.dataAbertura)) = :y`,
        { y: opts.ano },
      );
    } else if (opts.escopo === 'mes' && opts.ano != null && opts.mes != null) {
      const ym = `${opts.ano}-${String(opts.mes).padStart(2, '0')}`;
      qb.andWhere(
        `TO_CHAR(COALESCE(o.dataConclusao, o.dataAbertura), 'YYYY-MM') = :ym`,
        { ym },
      );
    }

    const raw = await qb.getRawOne<{
      sum: string | number;
      cnt: string | number;
    }>();
    return {
      sum: Number(raw?.sum ?? 0),
      count: Number(raw?.cnt ?? 0),
    };
  }

  private tituloPeriodoRelatorio(opts: RelatorioFiscalOpts): string {
    if (opts.escopo === 'geral') {
      return 'Período: consolidado geral (todas as ordens cadastradas)';
    }
    if (opts.escopo === 'ano' && opts.ano != null) {
      return `Período-calendário: exercício ${opts.ano}`;
    }
    if (opts.escopo === 'mes' && opts.ano != null && opts.mes != null) {
      const d = new Date(opts.ano, opts.mes - 1, 1);
      return `Período-calendário: ${d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    }
    return 'Período';
  }

  private async loadRelatorioFiscalDados(
    opts: RelatorioFiscalOpts,
  ): Promise<RelatorioFiscalDados> {
    const [rows, receita] = await Promise.all([
      this.fetchOrdensRelatorioFiscal(opts),
      this.sumReceitaServicosConcluidos(opts),
    ]);

    let abertos = 0;
    let fazendo = 0;
    let prontos = 0;
    let carteiraListada = 0;
    for (const o of rows) {
      if (o.status === OrdemServicoStatus.ABERTO) {
        abertos++;
        carteiraListada += o.valor;
      } else if (o.status === OrdemServicoStatus.FAZENDO) {
        fazendo++;
        carteiraListada += o.valor;
      } else {
        prontos++;
      }
    }

    const ticketMedio =
      receita.count > 0 ? receita.sum / receita.count : null;

    const totalValoresDemonstrativo = rows.reduce(
      (s, o) => s + Number(o.valor ?? 0),
      0,
    );

    return {
      rows,
      receita,
      abertos,
      fazendo,
      prontos,
      carteiraListada,
      ticketMedio,
      totalValoresDemonstrativo,
    };
  }

  async pdfRelatorioFiscal(opts: RelatorioFiscalOpts): Promise<Buffer> {
    const {
      rows,
      receita,
      abertos,
      fazendo,
      prontos,
      carteiraListada,
      ticketMedio,
      totalValoresDemonstrativo,
    } = await this.loadRelatorioFiscalDados(opts);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const avisoLegal =
        'Aviso: este relatório reflete apenas valores cadastrados no sistema (ordens de serviço). Não substitui nota fiscal eletrônica, extratos bancários, DASN-SIMEI, PGDAS-D, livros contábeis nem outros documentos exigidos pela legislação. Para declaração de impostos, valide com seu contador quais documentos oficiais devem ser usados como base de faturamento no regime aplicável (MEI, Simples Nacional, lucro presumido/real etc.).';

      this.drawPdfPageBanner(
        doc,
        `Relatório fiscal e gerencial — ${FUNILARIA_NOME}`,
        [
          this.tituloPeriodoRelatorio(opts),
          `Gerado em ${fmtDataHoraBr(new Date())}`,
        ],
      );

      const yAviso = doc.y;
      doc.save();
      doc.fillColor(PDF_THEME.cardBg).roundedRect(48, yAviso, 504, 58, 4).fill();
      doc.strokeColor(PDF_THEME.border).lineWidth(0.5);
      doc.roundedRect(48, yAviso, 504, 58, 4).stroke();
      doc.restore();
      doc
        .fillColor(PDF_THEME.muted)
        .font('Helvetica')
        .fontSize(7.5)
        .text(avisoLegal, 56, yAviso + 8, { width: 488, align: 'justify' });
      doc.y = yAviso + 66;
      doc.x = 50;
      doc.fillColor(PDF_THEME.body);

      const yResumo = doc.y;
      const resumoH = 78;
      doc.save();
      doc.fillColor('#e8eaff').roundedRect(48, yResumo, 504, resumoH, 4).fill();
      doc.strokeColor(PDF_THEME.bannerBg).lineWidth(1);
      doc.roundedRect(48, yResumo, 504, resumoH, 4).stroke();
      doc.restore();
      doc.x = 56;
      doc.y = yResumo + 8;
      doc
        .fillColor(PDF_THEME.bannerBg)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Resumo financeiro', { width: 488 });
      doc.moveDown(0.35);
      doc.fillColor(PDF_THEME.body).font('Helvetica').fontSize(9);
      doc.text(
        `Receita de serviços concluídos no período (status Pronto; competência pela data de conclusão, ou data de abertura se a conclusão não estiver registrada): ${fmtBrl(receita.sum)}`,
        { width: 488 },
      );
      doc.text(`Quantidade de OS concluídas (no período): ${receita.count}`);
      if (ticketMedio != null) {
        doc.text(
          `Ticket médio (concluídas no período): ${fmtBrl(ticketMedio)}`,
        );
      }
      doc.text(
        `Valor em carteira nas OS listadas (Aberto + Em andamento): ${fmtBrl(carteiraListada)}`,
        { width: 488 },
      );
      doc.text(
        `Ordens neste PDF (abertura ou conclusão no período): ${rows.length} — Aberto: ${abertos} · Em andamento: ${fazendo} · Pronto: ${prontos}`,
        { width: 488 },
      );
      doc.y = yResumo + resumoH + 14;
      doc.x = 50;

      if (!rows.length) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(PDF_THEME.body)
          .text('Nenhuma ordem no período selecionado.');
        doc.end();
        return;
      }

      doc
        .fillColor(PDF_THEME.bannerBg)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Demonstrativo analítico');
      doc.moveDown(0.45);
      doc.fillColor(PDF_THEME.body);

      const tableW = 455;
      const rowH = 12;
      const drawHeaderRow = (yy: number) => {
        doc.save();
        doc
          .fillColor(PDF_THEME.tableHeaderBg)
          .rect(50, yy - 1, tableW, rowH)
          .fill();
        doc.restore();
        doc.fillColor(PDF_THEME.tableHeaderText).font('Helvetica-Bold').fontSize(7);
        doc.text('ID', 52, yy + 3, { width: 22 });
        doc.text('Abert.', 75, yy + 3, { width: 40 });
        doc.text('Concl.', 116, yy + 3, { width: 40 });
        doc.text('Cliente', 157, yy + 3, { width: 143 });
        doc.text('Placa', 302, yy + 3, { width: 48 });
        doc.text('Status', 352, yy + 3, { width: 62 });
        doc.text('Valor', 418, yy + 3, { width: 87, align: 'right' });
        doc.fillColor(PDF_THEME.body);
        return yy + rowH + 5;
      };

      let ty = drawHeaderRow(doc.y);
      let rowIdx = 0;

      for (const o of rows) {
        if (ty > 735) {
          doc.addPage();
          this.drawPdfContinuationStrip(
            doc,
            `${FUNILARIA_NOME} · Demonstrativo analítico (continuação)`,
          );
          ty = drawHeaderRow(doc.y);
          rowIdx = 0;
        }
        if (rowIdx % 2 === 0) {
          doc.save();
          doc
            .fillColor(PDF_THEME.tableStripe)
            .rect(50, ty - 1, tableW, rowH)
            .fill();
          doc.restore();
        }
        const cli =
          o.cliente.length > 32 ? `${o.cliente.slice(0, 29)}…` : o.cliente;
        doc.font('Helvetica').fontSize(7).fillColor(PDF_THEME.body);
        doc.text(String(o.id), 52, ty + 2, { width: 22 });
        doc.text(fmtData(o.dataAbertura), 75, ty + 2, { width: 40 });
        doc.text(fmtData(o.dataConclusao), 116, ty + 2, { width: 40 });
        doc.text(cli, 157, ty + 2, { width: 143 });
        doc.text(o.placa, 302, ty + 2, { width: 48 });
        doc.text(statusLabel(o.status), 352, ty + 2, { width: 62 });
        doc.text(fmtBrl(o.valor), 418, ty + 2, { width: 87, align: 'right' });
        ty += rowH;
        rowIdx++;
      }

      ty += 4;
      if (ty > 718) {
        doc.addPage();
        this.drawPdfContinuationStrip(
          doc,
          `${FUNILARIA_NOME} · Totais do demonstrativo`,
        );
        ty = doc.y;
      }
      doc.save();
      doc.fillColor(PDF_THEME.cardBg).rect(50, ty - 2, tableW, rowH + 4).fill();
      doc.strokeColor(PDF_THEME.border).lineWidth(0.5);
      doc.rect(50, ty - 2, tableW, rowH + 4).stroke();
      doc.restore();
      ty += 2;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(PDF_THEME.body);
      doc.text('Total (soma dos valores no demonstrativo)', 157, ty, {
        width: 258,
      });
      doc.text(fmtBrl(totalValoresDemonstrativo), 418, ty, {
        width: 87,
        align: 'right',
      });

      doc.end();
    });
  }

  async excelRelatorioFiscal(opts: RelatorioFiscalOpts): Promise<Buffer> {
    const d = await this.loadRelatorioFiscalDados(opts);

    const aviso =
      'Aviso: este relatório reflete apenas valores cadastrados no sistema (ordens de serviço). Não substitui nota fiscal eletrônica, extratos bancários, DASN-SIMEI, PGDAS-D, livros contábeis nem outros documentos exigidos pela legislação. Para declaração de impostos, valide com seu contador quais documentos oficiais devem ser usados como base de faturamento no regime aplicável (MEI, Simples Nacional, lucro presumido/real etc.).';

    const fillIndigo = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF3730A3' },
    };
    const fillIndigoSoft = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFE0E7FF' },
    };
    const fillHeaderTable = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF4F46E5' },
    };
    const fillMuted = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFF1F5F9' },
    };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Relatório fiscal', {
      properties: { defaultRowHeight: 16 },
    });

    ws.mergeCells('A1:G1');
    ws.getCell('A1').value = `Relatório fiscal e gerencial — ${FUNILARIA_NOME}`;
    ws.getCell('A1').font = {
      bold: true,
      size: 14,
      color: { argb: 'FFFFFFFF' },
    };
    ws.getCell('A1').fill = fillIndigo;
    ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:G2');
    ws.getCell('A2').value = this.tituloPeriodoRelatorio(opts);
    ws.getCell('A2').fill = fillIndigoSoft;
    ws.getCell('A2').font = { bold: true, size: 11, color: { argb: 'FF312E81' } };
    ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('A3:G3');
    ws.getCell('A3').value = `Gerado em ${fmtDataHoraBr(new Date())}`;
    ws.getCell('A3').fill = fillIndigoSoft;
    ws.getCell('A3').font = { size: 10, color: { argb: 'FF475569' } };
    ws.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('A4:G4');
    ws.getCell('A4').value = aviso;
    ws.getCell('A4').alignment = { wrapText: true, vertical: 'top' };
    ws.getCell('A4').fill = fillMuted;
    ws.getCell('A4').font = { size: 9, color: { argb: 'FF64748B' } };
    ws.getRow(4).height = 72;

    let r = 6;
    ws.getCell(`A${r}`).value = 'Resumo financeiro';
    ws.getCell(`A${r}`).font = {
      bold: true,
      size: 11,
      color: { argb: 'FF3730A3' },
    };
    r++;

    ws.getCell(`A${r}`).value =
      'Receita de serviços concluídos no período (status Pronto; competência pela data de conclusão, ou data de abertura se a conclusão não estiver registrada)';
    ws.getCell(`B${r}`).value = d.receita.sum;
    ws.getCell(`B${r}`).numFmt = '"R$" #,##0.00';
    r++;

    ws.getCell(`A${r}`).value = 'Quantidade de OS concluídas (no período)';
    ws.getCell(`B${r}`).value = d.receita.count;
    r++;

    if (d.ticketMedio != null) {
      ws.getCell(`A${r}`).value = 'Ticket médio (concluídas no período)';
      ws.getCell(`B${r}`).value = d.ticketMedio;
      ws.getCell(`B${r}`).numFmt = '"R$" #,##0.00';
      r++;
    }

    ws.getCell(`A${r}`).value =
      'Valor em carteira nas OS listadas (Aberto + Em andamento)';
    ws.getCell(`B${r}`).value = d.carteiraListada;
    ws.getCell(`B${r}`).numFmt = '"R$" #,##0.00';
    r++;

    ws.getCell(`A${r}`).value =
      'Ordens na planilha (abertura ou conclusão no período)';
    ws.getCell(`B${r}`).value = d.rows.length;
    r++;
    ws.getCell(`A${r}`).value = 'Distribuição por status (listadas)';
    ws.getCell(`B${r}`).value = `Aberto: ${d.abertos} · Em andamento: ${d.fazendo} · Pronto: ${d.prontos}`;
    r += 2;

    ws.getCell(`A${r}`).value = 'Demonstrativo analítico';
    ws.getCell(`A${r}`).font = { bold: true, size: 11 };
    r++;

    const hdr = ws.getRow(r);
    hdr.getCell(1).value = 'ID';
    hdr.getCell(2).value = 'Data abertura';
    hdr.getCell(3).value = 'Data conclusão';
    hdr.getCell(4).value = 'Cliente';
    hdr.getCell(5).value = 'Placa';
    hdr.getCell(6).value = 'Status';
    hdr.getCell(7).value = 'Valor';
    for (let c = 1; c <= 7; c++) {
      hdr.getCell(c).fill = fillHeaderTable;
      hdr.getCell(c).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      hdr.getCell(c).border = thinBorder;
    }
    r++;

    if (!d.rows.length) {
      ws.getCell(`A${r}`).value = 'Nenhuma ordem no período selecionado.';
    } else {
      for (let i = 0; i < d.rows.length; i++) {
        const o = d.rows[i];
        const row = ws.getRow(r);
        row.getCell(1).value = o.id;
        row.getCell(2).value = fmtData(o.dataAbertura);
        row.getCell(3).value = fmtData(o.dataConclusao);
        row.getCell(4).value = o.cliente;
        row.getCell(5).value = o.placa;
        row.getCell(6).value = statusLabel(o.status);
        row.getCell(7).value = Number(o.valor ?? 0);
        row.getCell(7).numFmt = '"R$" #,##0.00';
        if (i % 2 === 0) {
          for (let c = 1; c <= 7; c++) {
            row.getCell(c).fill = fillMuted;
          }
        }
        for (let c = 1; c <= 7; c++) {
          row.getCell(c).border = thinBorder;
        }
        r++;
      }
      const tot = ws.getRow(r);
      for (let c = 1; c <= 7; c++) {
        tot.getCell(c).fill = fillIndigoSoft;
        tot.getCell(c).border = thinBorder;
      }
      tot.getCell(6).value = 'Total';
      tot.getCell(7).value = d.totalValoresDemonstrativo;
      tot.getCell(6).font = { bold: true, color: { argb: 'FF312E81' } };
      tot.getCell(7).font = { bold: true, color: { argb: 'FF312E81' } };
      tot.getCell(7).numFmt = '"R$" #,##0.00';
    }

    ws.columns = [
      { width: 8 },
      { width: 14 },
      { width: 14 },
      { width: 36 },
      { width: 12 },
      { width: 18 },
      { width: 14 },
    ];

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
