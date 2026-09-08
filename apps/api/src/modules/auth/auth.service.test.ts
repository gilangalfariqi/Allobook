import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal mock for FastifyInstance
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

const mockJwt = {
  sign: vi.fn().mockReturnValue('mock.token.value'),
  verify: vi.fn(),
};

const mockServer = {
  prisma: mockPrisma,
  jwt: mockJwt,
} as any;

// Import after mocks are set up
import { AuthService } from './auth.service';
import { ConflictError, UnauthorizedError } from '../../lib/errors';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock env
    vi.stubEnv('JWT_SECRET', 'test-secret-min-16-chars');
    vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-16chars');
    vi.stubEnv('JWT_ACCESS_EXPIRES', '15m');
    vi.stubEnv('JWT_REFRESH_EXPIRES', '7d');
    vi.stubEnv('DATABASE_URL', 'postgresql://test');
    vi.stubEnv('REDIS_URL', 'redis://localhost');
    vi.stubEnv('MEILISEARCH_HOST', 'http://localhost:7700');
    vi.stubEnv('MEILISEARCH_API_KEY', 'key');
    service = new AuthService(mockServer);
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'cuid1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw ConflictError if email is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'taken@example.com',
          name: 'User',
          password: 'password123',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'pass' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'cuid1',
        email: 'user@example.com',
        name: 'User',
        role: 'USER',
        // argon2 hash of 'correctpass' — wrong password 'wrongpass' should fail
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        createdAt: new Date(),
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'wrongpass' })
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
