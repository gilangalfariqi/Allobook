import { FastifyReply, FastifyRequest } from 'fastify';
import { WishlistService } from './wishlist.service';

export class WishlistController {
  constructor(private service: WishlistService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub;
    const wishlist = await this.service.getUserWishlist(userId);
    return reply.status(200).send(wishlist);
  }

  async add(request: FastifyRequest<{ Params: { bookId: string } }>, reply: FastifyReply) {
    const userId = request.user.sub;
    const { bookId } = request.params;
    const item = await this.service.addToWishlist(userId, bookId);
    return reply.status(201).send(item);
  }

  async remove(request: FastifyRequest<{ Params: { bookId: string } }>, reply: FastifyReply) {
    const userId = request.user.sub;
    const { bookId } = request.params;
    await this.service.removeFromWishlist(userId, bookId);
    return reply.status(200).send({ message: 'Removed from wishlist' });
  }

  async check(request: FastifyRequest<{ Params: { bookId: string } }>, reply: FastifyReply) {
    const userId = request.user.sub;
    const { bookId } = request.params;
    const result = await this.service.checkWishlist(userId, bookId);
    return reply.status(200).send(result);
  }
}
