import { FastifyReply, FastifyRequest } from 'fastify';
import { OrderService } from './order.service';
import {
  CreateOrderInput,
  CreateOrderSchema,
  UpdateOrderStatusInput,
  UpdateOrderStatusSchema,
  OrderQuery,
  OrderQuerySchema,
} from '@allobook/shared-types';

export class OrderController {
  constructor(private service: OrderService) {}

  async create(request: FastifyRequest<{ Body: CreateOrderInput }>, reply: FastifyReply) {
    const validatedBody = CreateOrderSchema.parse(request.body);
    const userId = request.user?.sub ?? null;
    const result = await this.service.createOrder(validatedBody, userId);
    return reply.status(201).send(result);
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const order = await this.service.getOrderById(id);
    return reply.status(200).send(order);
  }

  async getUserOrders(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub;
    const orders = await this.service.getUserOrders(userId);
    return reply.status(200).send(orders);
  }

  async getAllOrders(request: FastifyRequest<{ Querystring: OrderQuery }>, reply: FastifyReply) {
    const validatedQuery = OrderQuerySchema.parse(request.query);
    const result = await this.service.getAllOrders(validatedQuery);
    return reply.status(200).send(result);
  }

  async updateStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateOrderStatusInput }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const validatedBody = UpdateOrderStatusSchema.parse(request.body);
    const updated = await this.service.updateOrderStatus(id, validatedBody.status);
    return reply.status(200).send(updated);
  }
}
