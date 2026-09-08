import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '../../config/env';
import { AiRepository } from './ai.repository';
import { logger } from '../../lib/logger';

export interface ReviewItem {
  rating: number;
  body: string;
  createdAt?: Date | string;
}

export class SummarizationService {
  private anthropic: Anthropic | null = null;
  private readonly model = 'claude-3-5-haiku-20241022';

  constructor(private repo: AiRepository) {
    const apiKey = getEnv().ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      logger.warn('ANTHROPIC_API_KEY is not set. Review summarization will use fallback mode.');
    }
  }

  generateFallbackSummary(bookTitle: string, reviews: ReviewItem[]): string {
    if (reviews.length === 0) {
      return `Belum ada ulasan dari pembaca untuk buku "${bookTitle}". Jadilah yang pertama memberikan penilaian dan ulasan!`;
    }

    const avg = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
    const positiveCount = reviews.filter((r) => r.rating >= 4).length;
    const highlight = reviews[0]?.body ? ` Salah satu pembaca menyampaikan: "${reviews[0].body.slice(0, 120)}..."` : '';

    return `Berdasarkan ${reviews.length} ulasan pembaca, buku "${bookTitle}" memperoleh rata-rata penilaian ${avg} dari 5 bintang. Sebanyak ${positiveCount} pembaca memberikan apresiasi positif terhadap kualitas konten dan alur bacaan.${highlight}`;
  }

  async summarizeReviews(
    book: { id: string; title: string; author: string },
    reviews: ReviewItem[]
  ): Promise<string> {
    if (reviews.length === 0) {
      return this.generateFallbackSummary(book.title, []);
    }

    if (!this.anthropic) {
      const fallback = this.generateFallbackSummary(book.title, reviews);
      await this.repo.updateReviewSummary(book.id, fallback);
      return fallback;
    }

    const reviewsText = reviews
      .slice(0, 20)
      .map((r, i) => `[Ulasan ${i + 1}] Rating: ${r.rating}/5. Isi: "${r.body}"`)
      .join('\n');

    const prompt = `Anda adalah kurator buku profesional untuk toko buku AlloBook. 
Berikut adalah ulasan pembaca untuk buku "${book.title}" oleh ${book.author}:

${reviewsText}

Tugas Anda: Buat ringkasan ulasan (review summary) yang objektif, menarik, dan terstruktur dalam 2 paragraf singkat Bahasa Indonesia:
1. Paragraf 1: Konsensus umum pembaca dan apa yang paling disukai/dinikmati (keunggulan buku).
2. Paragraf 2: Catatan kritis atau untuk siapa buku ini paling cocok dibaca.

Gunakan nada kuratorial hangat dan ramah. Jangan gunakan bullet points. Maksimal 150 kata.`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((c) => c.type === 'text');
      const summary = textBlock ? textBlock.text.trim() : this.generateFallbackSummary(book.title, reviews);

      // Cost estimation: Haiku input $0.80/1M ($0.0000008), output $4.00/1M ($0.000004)
      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;
      const tokensUsed = promptTokens + completionTokens;
      const cost = promptTokens * 0.0000008 + completionTokens * 0.000004;

      await this.repo.logAiUsage({
        endpoint: '/books/:slug/review-summary',
        model: this.model,
        promptTokens,
        completionTokens,
        tokensUsed,
        estimatedCost: cost,
      });

      await this.repo.updateReviewSummary(book.id, summary);
      return summary;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Claude review summarization failed, using fallback');
      const fallback = this.generateFallbackSummary(book.title, reviews);
      await this.repo.updateReviewSummary(book.id, fallback);
      return fallback;
    }
  }
}
