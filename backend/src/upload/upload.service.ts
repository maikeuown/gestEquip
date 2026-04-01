import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async saveAttachment(file: Express.Multer.File, context: { equipmentId?: string; ticketId?: string }) {
    const url = `/uploads/${file.filename}`;
    const type = file.mimetype.startsWith('image/') ? 'IMAGE' : file.mimetype === 'application/pdf' || file.mimetype.includes('document') ? 'DOCUMENT' : 'OTHER';
    return this.prisma.attachment.create({
      data: {
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        type: type as any,
        ...(context.equipmentId && { equipmentId: context.equipmentId }),
        ...(context.ticketId && { ticketId: context.ticketId }),
      },
    });
  }

  async deleteAttachment(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new BadRequestException('Ficheiro não encontrado');
    const filePath = path.join(process.cwd(), 'uploads', att.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.prisma.attachment.delete({ where: { id } });
    return { message: 'Ficheiro eliminado' };
  }
}
