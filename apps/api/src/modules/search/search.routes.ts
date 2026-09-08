import { FastifyInstance } from 'fastify';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchQuerySchema, SearchSuggestSchema } from '@allobook/shared-types';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function searchRoutes(server: FastifyInstance) {
  const service = new SearchService(server);
  const controller = new SearchController(service);

  // Rate limiting for search: 60 req/min
  const searchRateLimit = {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  };

  // GET /search
  server.get(
    '/',
    {
      ...searchRateLimit,
      schema: {
        tags: ['search'],
        summary: 'Search books with keyword, genre, author, and pagination',
        querystring: zodToJsonSchema(SearchQuerySchema),
      },
    },
    controller.search.bind(controller)
  );

  // GET /search/suggest
  server.get(
    '/suggest',
    {
      ...searchRateLimit,
      schema: {
        tags: ['search'],
        summary: 'Instant search suggestions (dropdown)',
        querystring: zodToJsonSchema(SearchSuggestSchema),
      },
    },
    controller.suggest.bind(controller)
  );
}
