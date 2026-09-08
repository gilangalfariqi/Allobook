import { FastifyReply, FastifyRequest } from 'fastify';
import { ReviewService } from './review.service';
import { CreateReviewInput, CreateReviewSchema } from '@allobook/shared-types';

export class ReviewController {
  constructor(private service: ReviewService) {}

  async listByBook(request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) {
    const { slug } = request.params;
    const reviews = await this.service.getReviewsByBookSlug(slug);
    return reply.status(200).send(reviews);
  }

  async create(request: FastifyRequest<{ Body: CreateReviewInput }>, reply: FastifyReply) {
    const validatedBody = CreateReviewSchema.parse(request.body);
    const userId = request.user.sub;
    const review = await this.service.createReview(userId, validatedBody);
    return reply.status(201).send(review);
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const user = { id: request.user.sub, role: request.user.role };
    await this.service.deleteReview(id, user);
    return reply.status(200).send({ message: 'Review deleted successfully' });
  }
}
