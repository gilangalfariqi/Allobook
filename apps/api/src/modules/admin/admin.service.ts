import { FastifyInstance } from 'fastify';
import { AdminRepository } from './admin.repository';
import { UpdateStoreSettingsInput } from '@allobook/shared-types';

export class AdminService {
  private repo: AdminRepository;

  constructor(private server: FastifyInstance) {
    this.repo = new AdminRepository(server.prisma);
  }

  async getSettings() {
    return this.repo.getAllSettings();
  }

  async updateSettings(input: UpdateStoreSettingsInput) {
    return this.repo.updateSettings(input as Record<string, string>);
  }

  async getStats() {
    return this.repo.getDashboardStats();
  }
}
