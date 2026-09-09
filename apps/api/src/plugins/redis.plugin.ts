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
  const env = getEnv();
  if (!env.REDIS_URL || env.REDIS_URL.trim() === '') {
    server.log.warn('REDIS_URL not provided. Continuing without Redis cache.');
    server.decorate('redis', null as any);
    return;
  }

  try {
    const redis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    await redis.connect();
    server.decorate('redis', redis);
    server.log.info('Redis connected successfully.');

    server.addHook('onClose', async () => {
      await redis.quit();
    });
  } catch (err) {
    server.log.warn({ err }, 'Could not connect to Redis. Continuing without Redis cache.');
    server.decorate('redis', null as any);
  }
});

export default redisPlugin;
