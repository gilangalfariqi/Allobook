import { FastifyInstance } from 'fastify';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { CreateReviewSchema } from '@allobook/shared-types';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function reviewRoutes(server: FastifyInstance) {
  const service = new ReviewService(server);
  const controller = new ReviewController(service);

  // GET /books/:slug/reviews
  server.get(
    '/books/:slug/reviews',
    {
      schema: {
        tags: ['reviews'],
        summary: 'Get all reviews for a book by its slug',
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
          },
        },
      },
    },
    controller.listByBook.bind(controller)
  );

  // POST /books/:slug/reviews (or POST /reviews)
  server.post(
    '/books/:slug/reviews',
    {
      preHandler: [server.authenticate],
      schema: {
        tags: ['reviews'],
        summary: 'Submit a new review for a book (Auth required)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
          },
        },
        body: zodToJsonSchema(CreateReviewSchema),
      },
    },
    controller.create.bind(controller)
  );

  // DELETE /reviews/:id
  server.delete(
    '/reviews/:id',
    {
      preHandler: [server.authenticate],
      schema: {
        tags: ['reviews'],
        summary: 'Delete a review (Author or Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.delete.bind(controller)
  );
}
