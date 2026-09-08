import argon2 from 'argon2';
import { FastifyInstance } from 'fastify';
import { AuthRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.schema';
import { ConflictError, UnauthorizedError } from '../../lib/errors';
import { getEnv } from '../../config/env';

export class AuthService {
  private repo: AuthRepository;

  constructor(private server: FastifyInstance) {
    this.repo = new AuthRepository(server.prisma);
  }

  async register(input: RegisterInput) {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.repo.create({ ...input, passwordHash });

    const { accessToken, refreshToken } = this.generateTokens(user);
    return { user, accessToken, refreshToken };
  }

  async login(input: LoginInput) {
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };

    const { accessToken, refreshToken } = this.generateTokens(safeUser);
    return { user: safeUser, accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const env = getEnv();
      // Verify refresh token using refresh secret
      const payload = this.server.jwt.verify<{ sub: string; email: string; role: string }>(
        refreshToken,
        { key: env.JWT_REFRESH_SECRET }
      );

      const user = await this.repo.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const tokens = this.generateTokens(user);
      return { user, ...tokens };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  private generateTokens(user: { id: string; email: string; role: string }) {
    const env = getEnv();

    const accessToken = this.server.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: env.JWT_ACCESS_EXPIRES }
    );

    // Sign refresh token with a different secret for security
    const refreshToken = this.server.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { key: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES }
    );

    return { accessToken, refreshToken };
  }
}
