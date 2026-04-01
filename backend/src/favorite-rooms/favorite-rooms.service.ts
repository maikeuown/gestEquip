import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoriteRoomsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.favoriteRoom.findMany({
      where: { userId },
      include: { room: { include: { _count: { select: { equipment: true } } } } },
    });
  }

  async toggle(userId: string, roomId: string) {
    const existing = await this.prisma.favoriteRoom.findFirst({
      where: { userId, roomId },
    });

    if (existing) {
      await this.prisma.favoriteRoom.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.favoriteRoom.create({
      data: { user: { connect: { id: userId } }, room: { connect: { id: roomId } } },
    });
    return { favorited: true };
  }

  add(userId: string, roomId: string) {
    return this.prisma.favoriteRoom.create({
      data: { user: { connect: { id: userId } }, room: { connect: { id: roomId } } },
    });
  }

  async remove(userId: string, roomId: string) {
    await this.prisma.favoriteRoom.deleteMany({ where: { userId, roomId } });
    return { message: 'Favorito removido' };
  }
}
