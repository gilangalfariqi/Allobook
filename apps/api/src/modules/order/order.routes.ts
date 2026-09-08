import { FastifyInstance, FastifyRequest } from 'fastify';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CreateOrderSchema, UpdateOrderStatusSchema, OrderQuerySchema } from '@allobook/shared-types';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function orderRoutes(server: FastifyInstance) {
  const service = new OrderService(server);
  const controller = new OrderController(service);

  // Optional auth helper: attaches user if token is present, but doesn't fail if absent
  const optionalAuth = async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      // User is guest
    }
  };

  // POST /orders - Guest OR Authenticated
  server.post(
    '/',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['orders'],
        summary: 'Create a pre-order (Guest or Authenticated)',
        body: zodToJsonSchema(CreateOrderSchema),
      },
    },
    controller.create.bind(controller)
  );

  // GET /orders - User order history (Auth required)
  server.get(
    '/',
    {
      preHandler: [server.authenticate],
      schema: {
        tags: ['orders'],
        summary: 'Get order history for current authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getUserOrders.bind(controller)
  );

  // GET /orders/admin - All orders (Admin only)
  server.get(
    '/admin',
    {
      preHandler: [server.authenticateAdmin],
      schema: {
        tags: ['orders'],
        summary: 'List all orders (Admin only)',
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(OrderQuerySchema),
      },
    },
    controller.getAllOrders.bind(controller)
  );

  // GET /orders/:id - Order detail (Guest or Auth)
  server.get(
    '/:id',
    {
      schema: {
        tags: ['orders'],
        summary: 'Get order detail by ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.getById.bind(controller)
  );

  // PATCH /orders/:id/status - Admin only
  server.patch(
    '/:id/status',
    {
      preHandler: [server.authenticateAdmin],
      schema: {
        tags: ['orders'],
        summary: 'Update order status (Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: zodToJsonSchema(UpdateOrderStatusSchema),
      },
    },
    controller.updateStatus.bind(controller)
  );
}
