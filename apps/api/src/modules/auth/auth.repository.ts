import { PrismaClient } from '@prisma/client';
import { RegisterInput } from './auth.schema';

export class AuthRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async create(data: RegisterInput & { passwordHash: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }
}
