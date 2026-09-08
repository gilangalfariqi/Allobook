import { FastifyReply, FastifyRequest } from 'fastify';
import { BookService } from './book.service';
import { CreateBookInput, UpdateBookInput, BookQuery, BookQuerySchema, CreateBookSchema, UpdateBookSchema } from '@allobook/shared-types';

export class BookController {
  constructor(private service: BookService) {}

  async list(request: FastifyRequest<{ Querystring: BookQuery }>, reply: FastifyReply) {
    const validatedQuery = BookQuerySchema.parse(request.query);
    const result = await this.service.getBooks(validatedQuery);
    return reply.status(200).send(result);
  }

  async getBySlug(request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) {
    const { slug } = request.params;
    const book = await this.service.getBookBySlug(slug);
    return reply.status(200).send(book);
  }

  async create(request: FastifyRequest<{ Body: CreateBookInput }>, reply: FastifyReply) {
    const validatedBody = CreateBookSchema.parse(request.body);
    const book = await this.service.createBook(validatedBody);
    return reply.status(201).send(book);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateBookInput }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const validatedBody = UpdateBookSchema.parse(request.body);
    const book = await this.service.updateBook(id, validatedBody);
    return reply.status(200).send(book);
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const deleted = await this.service.deleteBook(id);
    return reply.status(200).send({ message: 'Book deleted successfully', id: deleted.id });
  }
}
