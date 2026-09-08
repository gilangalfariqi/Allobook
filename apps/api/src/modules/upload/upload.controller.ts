import { FastifyReply, FastifyRequest } from 'fastify';
import { UploadService } from './upload.service';
import { BadRequestError } from '../../lib/errors';

export class UploadController {
  constructor(private service: UploadService) {}

  async uploadCover(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();
    if (!data) {
      throw new BadRequestError('No file uploaded');
    }

    const buffer = await data.toBuffer();
    const result = await this.service.uploadFile({
      buffer,
      mimetype: data.mimetype,
      originalFilename: data.filename,
      folder: 'covers',
      maxSizeBytes: 5 * 1024 * 1024, // 5MB
    });

    return reply.status(201).send(result);
  }

  async uploadReviewImage(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();
    if (!data) {
      throw new BadRequestError('No file uploaded');
    }

    const buffer = await data.toBuffer();
    const result = await this.service.uploadFile({
      buffer,
      mimetype: data.mimetype,
      originalFilename: data.filename,
      folder: 'reviews',
      maxSizeBytes: 2 * 1024 * 1024, // 2MB
    });

    return reply.status(201).send(result);
  }
}
