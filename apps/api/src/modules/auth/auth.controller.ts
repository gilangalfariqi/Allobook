import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterInput, LoginInput, RefreshTokenInput } from './auth.schema';

export class AuthController {
  private service: AuthService;

  constructor(service: AuthService) {
    this.service = service;
  }

  async register(
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply
  ) {
    const result = await this.service.register(request.body);
    return reply.status(201).send({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  async login(
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
  ) {
    const result = await this.service.login(request.body);
    return reply.send({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  async refresh(
    request: FastifyRequest<{ Body: RefreshTokenInput }>,
    reply: FastifyReply
  ) {
    const result = await this.service.refresh(request.body.refreshToken);
    return reply.send({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  async logout(_request: FastifyRequest, reply: FastifyReply) {
    // Stateless JWT — client drops tokens; in future can use Redis blocklist
    return reply.send({ message: 'Logged out successfully' });
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await this.service['repo'].findById(request.user.sub);
    return reply.send({ user });
  }
}
