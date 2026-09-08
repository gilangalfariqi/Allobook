import { FastifyInstance } from 'fastify';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

export async function wishlistRoutes(server: FastifyInstance) {
  const service = new WishlistService(server);
  const controller = new WishlistController(service);

  // All wishlist routes require authentication
  server.addHook('preHandler', server.authenticate);

  // GET /wishlist
  server.get(
    '/',
    {
      schema: {
        tags: ['wishlist'],
        summary: 'Get user wishlist',
        security: [{ bearerAuth: [] }],
      },
    },
    controller.list.bind(controller)
  );

  // POST /wishlist/:bookId
  server.post(
    '/:bookId',
    {
      schema: {
        tags: ['wishlist'],
        summary: 'Add book to wishlist',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['bookId'],
          properties: {
            bookId: { type: 'string' },
          },
        },
      },
    },
    controller.add.bind(controller)
  );

  // DELETE /wishlist/:bookId
  server.delete(
    '/:bookId',
    {
      schema: {
        tags: ['wishlist'],
        summary: 'Remove book from wishlist',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['bookId'],
          properties: {
            bookId: { type: 'string' },
          },
        },
      },
    },
    controller.remove.bind(controller)
  );

  // GET /wishlist/:bookId/check
  server.get(
    '/:bookId/check',
    {
      schema: {
        tags: ['wishlist'],
        summary: 'Check if a book is in user wishlist',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['bookId'],
          properties: {
            bookId: { type: 'string' },
          },
        },
      },
    },
    controller.check.bind(controller)
  );
}
