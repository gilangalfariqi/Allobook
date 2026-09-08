import { FastifyReply, FastifyRequest } from 'fastify';
import { SearchService } from './search.service';
import { SearchQuery, SearchQuerySchema, SearchSuggest, SearchSuggestSchema } from '@allobook/shared-types';

export class SearchController {
  constructor(private service: SearchService) {}

  async search(request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) {
    const validatedQuery = SearchQuerySchema.parse(request.query);
    const result = await this.service.search(validatedQuery);
    return reply.status(200).send(result);
  }

  async suggest(request: FastifyRequest<{ Querystring: SearchSuggest }>, reply: FastifyReply) {
    const validatedQuery = SearchSuggestSchema.parse(request.query);
    const suggestions = await this.service.suggest(validatedQuery);
    return reply.status(200).send(suggestions);
  }
}
