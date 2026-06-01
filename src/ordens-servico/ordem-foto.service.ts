import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { OrdemServicoFoto } from './ordem-servico-foto.entity';
import { OrdemServico } from './ordem-servico.entity';

@Injectable()
export class OrdemFotoService {
  constructor(
    @InjectRepository(OrdemServicoFoto)
    private readonly fotoRepo: Repository<OrdemServicoFoto>,
    @InjectRepository(OrdemServico)
    private readonly ordemRepo: Repository<OrdemServico>,
  ) {}

  async add(
    ordemId: number,
    tipo: string,
    file: Express.Multer.File,
  ): Promise<{ id: number; tipo: string; url: string }> {
    if (tipo !== 'antes' && tipo !== 'depois') {
      throw new BadRequestException('Campo "tipo" deve ser "antes" ou "depois".');
    }
    await this.ordemRepo.findOneByOrFail({ id: ordemId });
    const relative = `ordens/${ordemId}/${file.filename}`;
    const row = await this.fotoRepo.save(
      this.fotoRepo.create({
        ordemId,
        tipo: tipo as 'antes' | 'depois',
        arquivo: relative,
      }),
    );
    return {
      id: row.id,
      tipo: row.tipo,
      url: `/uploads/${row.arquivo}`,
    };
  }

  async list(ordemId: number) {
    await this.ordemRepo.findOneByOrFail({ id: ordemId });
    const rows = await this.fotoRepo.find({
      where: { ordemId },
      order: { id: 'ASC' },
    });
    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      url: `/uploads/${r.arquivo}`,
    }));
  }

  async remove(ordemId: number, fotoId: number): Promise<void> {
    const row = await this.fotoRepo.findOne({
      where: { id: fotoId, ordemId },
    });
    if (!row) {
      throw new NotFoundException('Foto não encontrada nesta ordem.');
    }
    const full = join(process.cwd(), 'uploads', row.arquivo);
    await this.fotoRepo.remove(row);
    if (existsSync(full)) unlinkSync(full);
  }
}
