import { FastifyReply, FastifyRequest } from 'fastify';
import { AdminService } from './admin.service';
import { UpdateStoreSettingsInput, UpdateStoreSettingsSchema } from '@allobook/shared-types';

export class AdminController {
  constructor(private service: AdminService) {}

  async getSettings(request: FastifyRequest, reply: FastifyReply) {
    const settings = await this.service.getSettings();
    return reply.status(200).send(settings);
  }

  async updateSettings(
    request: FastifyRequest<{ Body: UpdateStoreSettingsInput }>,
    reply: FastifyReply
  ) {
    const validatedBody = UpdateStoreSettingsSchema.parse(request.body);
    const updated = await this.service.updateSettings(validatedBody);
    return reply.status(200).send(updated);
  }

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await this.service.getStats();
    return reply.status(200).send(stats);
  }
}
