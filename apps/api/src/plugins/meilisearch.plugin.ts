import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { MeiliSearch } from 'meilisearch';
import { getEnv } from '../config/env';

declare module 'fastify' {
  interface FastifyInstance {
    meilisearch: MeiliSearch;
  }
}

const meilisearchPlugin: FastifyPluginAsync = fp(async (server) => {
  const client = new MeiliSearch({
    host: getEnv().MEILISEARCH_HOST,
    apiKey: getEnv().MEILISEARCH_API_KEY,
  });

  // Ensure books index exists with correct settings
  try {
    await client.createIndex('books', { primaryKey: 'id' });
  } catch {
    // Index may already exist
  }

  await client.index('books').updateSettings({
    searchableAttributes: ['title', 'author', 'description'],
    filterableAttributes: ['categories', 'isPreOrder', 'price'],
    sortableAttributes: ['price', 'publishedAt', 'createdAt'],
  });

  server.decorate('meilisearch', client);
});

export default meilisearchPlugin;
