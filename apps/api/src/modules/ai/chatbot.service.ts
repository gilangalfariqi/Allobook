import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '../../config/env';
import { AiRepository, SimilarBookResult } from './ai.repository';
import { EmbeddingService } from './embedding.service';
import { logger } from '../../lib/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  suggestedBooks: SimilarBookResult[];
}

export class ChatbotService {
  private anthropic: Anthropic | null = null;
  private readonly model = 'claude-3-5-haiku-20241022';

  constructor(
    private repo: AiRepository,
    private embeddingService: EmbeddingService
  ) {
    const apiKey = getEnv().ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      logger.warn('ANTHROPIC_API_KEY is not set. AlloBot will use intelligent rule-based fallback.');
    }
  }

  async chat(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    // 1. Generate query embedding for RAG vector search
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await this.embeddingService.generateEmbedding(message);
    } catch {
      // Fallback to keyword search if embedding generation fails
      queryEmbedding = null;
    }

    // 2. Retrieve relevant books from database via pgvector or keywords
    const relevantBooks = await this.repo.searchBooksForContext(queryEmbedding, message, 4);

    // 3. Fallback response if Anthropic Claude is not configured
    if (!this.anthropic) {
      const fallbackReply = this.generateFallbackReply(message, relevantBooks);
      return {
        reply: fallbackReply,
        suggestedBooks: relevantBooks,
      };
    }

    // 4. Build RAG prompt with store context and catalog items
    const booksContext = relevantBooks.length > 0
      ? relevantBooks
          .map(
            (b, i) =>
              `${i + 1}. "${b.title}" oleh ${b.author} | Harga: Rp ${b.price.toLocaleString('id-ID')} | Status: ${
                b.isPreOrder ? 'Pre-Order (PO)' : 'Ready Stock'
              } (Stok: ${b.stock}) | Sinopsis: ${b.description ? b.description.slice(0, 180) + '...' : '-'}`
          )
          .join('\n')
      : 'Tidak ada buku spesifik yang cocok langsung dari pencarian cepat.';

    const systemPrompt = `Anda adalah "AlloBot", asisten kurator buku virtual yang cerdas, hangat, dan berwawasan sastra untuk toko buku AlloBook.

Konteks Toko AlloBook:
- AlloBook adalah platform semi e-commerce kurasi buku bermutu (Kategori: Fiksi, Sejarah, Sains, Desain, Arsitektur, Filosofi).
- Memiliki sistem Pre-Order (PO) via WhatsApp Concierge untuk buku impor/langka/terbitan baru dengan status: PENDING → PROCESSING → CONFIRMED → SHIPPED → DONE.
- Buku Ready Stock dapat langsung dimasukkan keranjang belanja.

Katalog Buku Relevan di Database AlloBook Saat Ini:
${booksContext}

Panduan Anda:
1. Jawab pertanyaan pengguna secara ringkas, hangat, dan berbobot (maksimal 150-200 kata).
2. Jika pengguna meminta rekomendasi buku atau menanyakan topik tertentu, prioritaskan merekomendasikan judul dari daftar buku di atas dan jelaskan secara singkat daya tariknya.
3. Jika pengguna bertanya cara membeli atau pre-order, jelaskan bahwa buku Ready Stock bisa langsung di-checkout di web, sedangkan buku Pre-Order dapat dipesan melalui concierge WhatsApp.
4. Gunakan Bahasa Indonesia yang santun, ramah, dan bersahabat.`;

    // Format conversation history for Anthropic API
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add up to 6 past messages for context
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      messages.push({ role: h.role, content: h.content });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 350,
        system: systemPrompt,
        messages,
      });

      const textBlock = response.content.find((c) => c.type === 'text');
      const reply = textBlock ? textBlock.text.trim() : this.generateFallbackReply(message, relevantBooks);

      // Log AI Usage
      const promptTokens = response.usage.input_tokens;
      const completionTokens = response.usage.output_tokens;
      const tokensUsed = promptTokens + completionTokens;
      const cost = promptTokens * 0.0000008 + completionTokens * 0.000004;

      await this.repo.logAiUsage({
        endpoint: '/ai/chat',
        model: this.model,
        promptTokens,
        completionTokens,
        tokensUsed,
        estimatedCost: cost,
      });

      return {
        reply,
        suggestedBooks: relevantBooks,
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Claude chat generation failed, using intelligent fallback');
      const reply = this.generateFallbackReply(message, relevantBooks);
      return {
        reply,
        suggestedBooks: relevantBooks,
      };
    }
  }

  private generateFallbackReply(message: string, books: SimilarBookResult[]): string {
    const lower = message.toLowerCase();

    // Intent: Pre-order & Order Flow
    if (lower.includes('pre-order') || lower.includes('po') || lower.includes('cara pesan') || lower.includes('whatsapp') || lower.includes('wa') || lower.includes('beli')) {
      return (
        'Halo! Di AlloBook, Anda dapat memesan buku dengan mudah:\n\n' +
        '1. **Buku Ready Stock**: Cukup pilih buku di katalog, tambahkan ke keranjang, dan lakukan checkout langsung.\n' +
        '2. **Buku Pre-Order (PO)**: Untuk buku langka atau terbitan mendatang, Anda akan terhubung langsung dengan WhatsApp Concierge kami untuk pendampingan personal.\n\n' +
        'Status pesanan Anda dapat dilacak bertahap: PENDING → PROCESSING → CONFIRMED → SHIPPED → DONE.'
      );
    }

    // Intent: Status Tracking
    if (lower.includes('status') || lower.includes('lacak') || lower.includes('tracking')) {
      return (
        'Anda dapat memantau status pesanan kapan saja melalui menu **Akun Saya → Riwayat Pesanan** di navigasi atas. ' +
        'Setiap pembaruan status (dari persiapan hingga kurir pengiriman) juga dikonfirmasikan oleh tim kurator kami via WhatsApp.'
      );
    }

    // Intent: Book Recommendation / General query
    if (books.length > 0) {
      const bookList = books.slice(0, 3).map((b) => `• **${b.title}** oleh ${b.author} (${b.isPreOrder ? 'Pre-Order' : 'Ready Stock'})`).join('\n');
      return (
        `Tentu! Berdasarkan koleksi kurasi pilihan di AlloBook, berikut beberapa rekomendasi menarik yang relevan untuk Anda:\n\n` +
        `${bookList}\n\n` +
        `Silakan klik kartu buku di bawah ini untuk membaca sinopsis lengkap atau memasukkannya ke daftar belanja Anda!`
      );
    }

    return (
      'Halo! Saya AlloBot, asisten kurator buku virtual AlloBook. ' +
      'Saya siap membantu Anda menemukan rekomendasi buku berkualitas, mengecek ketersediaan katalog, ' +
      'atau memandu proses Pre-Order via WhatsApp Concierge. Ada topik atau genre buku yang sedang Anda cari?'
    );
  }
}
