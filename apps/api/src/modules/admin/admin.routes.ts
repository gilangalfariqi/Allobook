import { FastifyInstance } from 'fastify';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UpdateStoreSettingsSchema } from '@allobook/shared-types';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function adminRoutes(server: FastifyInstance) {
  const service = new AdminService(server);
  const controller = new AdminController(service);

  // All admin endpoints require admin authentication
  server.addHook('preHandler', server.authenticateAdmin);

  // GET /admin/settings
  server.get(
    '/settings',
    {
      schema: {
        tags: ['admin'],
        summary: 'Get store settings (Admin only)',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getSettings.bind(controller)
  );

  // PUT /admin/settings
  server.put(
    '/settings',
    {
      schema: {
        tags: ['admin'],
        summary: 'Update store settings (Admin only)',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(UpdateStoreSettingsSchema),
      },
    },
    controller.updateSettings.bind(controller)
  );

  // GET /admin/stats
  server.get(
    '/stats',
    {
      schema: {
        tags: ['admin'],
        summary: 'Get dashboard statistics (Admin only)',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getStats.bind(controller)
  );
}
