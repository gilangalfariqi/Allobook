import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  await prisma.$connect();

  server.decorate('prisma', prisma);

  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
});

export default prismaPlugin;
