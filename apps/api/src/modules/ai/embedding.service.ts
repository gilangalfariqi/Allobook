import OpenAI from 'openai';
import { getEnv } from '../../config/env';
import { AiRepository } from './ai.repository';
import { logger } from '../../lib/logger';

export class EmbeddingService {
  private openai: OpenAI | null = null;

  constructor(private repo: AiRepository) {
    const apiKey = getEnv().OPENAI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.openai = new OpenAI({ apiKey });
    } else {
      logger.warn('OPENAI_API_KEY is not set. Semantic embeddings will use fallback mode.');
    }
  }

  prepareBookContent(book: {
    title: string;
    author: string;
    description: string;
    categories?: Array<{ name: string } | string>;
  }): string {
    const catList = book.categories
      ? book.categories.map((c) => (typeof c === 'string' ? c : c.name)).join(', ')
      : '';

    return [
      `Judul: ${book.title}`,
      `Penulis: ${book.author}`,
      catList ? `Kategori: ${catList}` : '',
      `Deskripsi: ${book.description.slice(0, 1000)}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) {
      logger.info('OpenAI client not configured. Skipping embedding generation.');
      return null;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) return null;

      const tokens = response.usage?.total_tokens || Math.ceil(text.length / 4);
      // Cost: $0.02 per 1M tokens = 0.00000002 per token
      const cost = tokens * 0.00000002;

      await this.repo.logAiUsage({
        endpoint: '/embeddings',
        model: 'text-embedding-3-small',
        promptTokens: tokens,
        completionTokens: 0,
        tokensUsed: tokens,
        estimatedCost: cost,
      });

      return embedding;
    } catch (err: any) {
      logger.error({ err: err.message }, 'OpenAI embedding generation failed');
      return null;
    }
  }

  async generateAndSaveBookEmbedding(book: {
    id: string;
    title: string;
    author: string;
    description: string;
    categories?: Array<{ name: string } | string>;
  }): Promise<boolean> {
    const text = this.prepareBookContent(book);
    const embedding = await this.generateEmbedding(text);
    if (!embedding) return false;

    await this.repo.updateBookEmbedding(book.id, embedding);
    return true;
  }
}
