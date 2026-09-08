import { FastifyInstance } from 'fastify';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

export async function uploadRoutes(server: FastifyInstance) {
  const service = new UploadService();
  const controller = new UploadController(service);

  // POST /uploads/cover - Admin only
  server.post(
    '/cover',
    {
      preHandler: [server.authenticateAdmin],
      schema: {
        tags: ['upload'],
        summary: 'Upload a book cover image (Admin only, max 5MB)',
        security: [{ bearerAuth: [] }],
        response: {
          201: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
        },
      },
    },
    controller.uploadCover.bind(controller)
  );

  // POST /uploads/review-image - Auth required
  server.post(
    '/review-image',
    {
      preHandler: [server.authenticate],
      schema: {
        tags: ['upload'],
        summary: 'Upload a review photo (Auth required, max 2MB)',
        security: [{ bearerAuth: [] }],
        response: {
          201: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
        },
      },
    },
    controller.uploadReviewImage.bind(controller)
  );
}
