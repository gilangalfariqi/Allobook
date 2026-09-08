import { FastifyInstance } from 'fastify';
import { BookController } from './book.controller';
import { BookService } from './book.service';
import { CreateBookSchema, UpdateBookSchema, BookQuerySchema } from '@allobook/shared-types';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function bookRoutes(server: FastifyInstance) {
  const service = new BookService(server);
  const controller = new BookController(service);

  // GET /books - Public catalog listing
  server.get(
    '/',
    {
      schema: {
        tags: ['books'],
        summary: 'List books with pagination, search, and filters',
        querystring: zodToJsonSchema(BookQuerySchema),
      },
    },
    controller.list.bind(controller)
  );

  // GET /books/:slug - Public book detail
  server.get(
    '/:slug',
    {
      schema: {
        tags: ['books'],
        summary: 'Get book details by slug',
        params: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
          },
        },
      },
    },
    controller.getBySlug.bind(controller)
  );

  // POST /books - Admin only
  server.post(
    '/',
    {
      preHandler: [server.authenticateAdmin],
      schema: {
        tags: ['books'],
        summary: 'Create a new book (Admin only)',
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(CreateBookSchema),
      },
    },
    controller.create.bind(controller)
  );

  // PUT /books/:id - Admin only
  server.put(
    '/:id',
    {
      preHandler: [server.authenticateAdmin],
      schema: {
        tags: ['books'],
        summary: 'Update a book (Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: zodToJsonSchema(UpdateBookSchema),
      },
    },
    controller.update.bind(controller)
  );

  // DELETE /books/:id - Admin only
  server.delete(
    '/:id',
    {
      preHandler: [server.authenticateAdmin],
      schema: {
        tags: ['books'],
        summary: 'Delete a book (Admin only)',
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
