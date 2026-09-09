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
  const { MEILISEARCH_HOST, MEILISEARCH_API_KEY } = getEnv();

  if (!MEILISEARCH_HOST) {
    server.log.info('MEILISEARCH_HOST not provided. Search will use PostgreSQL fallback.');
    server.decorate('meilisearch', null as any);
    return;
  }

  try {
    const client = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY,
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
    server.log.info('Meilisearch connected and initialized successfully.');
  } catch (err) {
    server.log.warn({ err }, 'Could not connect to Meilisearch, search will use PostgreSQL fallback');
    server.decorate('meilisearch', null as any);
  }
});

export default meilisearchPlugin;
