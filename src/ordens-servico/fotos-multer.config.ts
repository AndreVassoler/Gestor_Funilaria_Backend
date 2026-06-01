import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export function fotosMulterOptions() {
  return {
    storage: diskStorage({
      destination: (req, _file, cb) => {
        const id = (req.params as { id: string }).id;
        const dir = join(process.cwd(), 'uploads', 'ordens', String(id));
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname) || '.jpg';
        cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: 6 * 1024 * 1024 },
    fileFilter: (
      _req: Express.Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const ok = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype);
      if (!ok) {
        return cb(new Error('Use apenas imagem JPEG, PNG ou WebP.'), false);
      }
      cb(null, true);
    },
  };
}
