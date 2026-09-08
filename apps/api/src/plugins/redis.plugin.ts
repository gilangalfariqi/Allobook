import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import IORedis from 'ioredis';
import { getEnv } from '../config/env';

declare module 'fastify' {
  interface FastifyInstance {
    redis: IORedis;
  }
}

const redisPlugin: FastifyPluginAsync = fp(async (server) => {
  const redis = new IORedis(getEnv().REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  await redis.connect();

  server.decorate('redis', redis);

  server.addHook('onClose', async () => {
    await redis.quit();
  });
});

export default redisPlugin;
