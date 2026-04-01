import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { institution: true },
    });
    if (!user || !user.isActive) return null;
    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) return null;
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Email ou palavra-passe incorretos');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.generateTokens(user.id, user.email, user.role, user.institutionId);
    return {
      user: {
        id: user.id, email: user.email, firstName: user.firstName,
        lastName: user.lastName, role: user.role, institutionId: user.institutionId,
        institution: user.institution, avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async register(dto: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email já está em uso');
    const institution = await this.prisma.institution.findUnique({ where: { id: dto.institutionId } });
    if (!institution) throw new BadRequestException('Instituição não encontrada');
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { ...dto, email: dto.email.toLowerCase(), passwordHash },
      include: { institution: true },
    });
    const tokens = await this.generateTokens(user.id, user.email, user.role, user.institutionId);
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { institution: true } } },
    });
    if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException('Token inválido ou expirado');
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(stored.user.id, stored.user.email, stored.user.role, stored.user.institutionId);
    return {
      user: { id: stored.user.id, email: stored.user.email, firstName: stored.user.firstName, lastName: stored.user.lastName, role: stored.user.role, institutionId: stored.user.institutionId, institution: stored.user.institution },
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Sessão terminada com sucesso' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) throw new BadRequestException('Palavra-passe atual incorreta');
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Palavra-passe alterada com sucesso' };
  }

  private async generateTokens(userId: string, email: string, role: string, institutionId: string) {
    const payload = { sub: userId, email, role, institutionId };
    const accessToken = this.jwtService.sign(payload);
    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.prisma.refreshToken.create({ data: { userId, token: refreshTokenValue, expiresAt } });
    return { accessToken, refreshToken: refreshTokenValue, tokenType: 'Bearer' };
  }
}
