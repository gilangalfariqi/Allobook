import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '../../config/env';
import { IntentRouterService } from './intent-router.service';
import { RetrievalService, RetrievalResult } from './retrieval.service';
import { ChatbotRepository } from './chatbot.repository';
import { SimilarBookResult } from '../ai/ai.repository';
import { logger } from '../../lib/logger';

export interface ChatbotResponse {
  reply: string;
  intent: string;
  suggestedBooks: SimilarBookResult[];
  requiresOrderVerification: boolean;
  orderSummary?: any;
  whatsAppHandoffUrl?: string;
}

export class ChatbotService {
  private anthropic: Anthropic | null = null;
  // Claude Sonnet for reasoning
  private readonly reasoningModel = 'claude-3-5-sonnet-20241022';

  constructor(
    private routerService: IntentRouterService,
    private retrievalService: RetrievalService,
    private repo: ChatbotRepository
  ) {
    const apiKey = getEnv().ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      logger.warn('ANTHROPIC_API_KEY is not set. Chatbot will use rule-based guardrail fallback.');
    }
  }

  getWhatsAppHandoffUrl(customText?: string): string {
    const rawNumber = getEnv().WHATSAPP_NUMBER || '6281234567890';
    const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
    const text = customText || 'Halo Admin AlloBook, saya ingin bertanya lebih lanjut mengenai kurasi buku / pesanan saya.';
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  }

  async processMessage(
    message: string,
    sessionId: string,
    orderSessionToken?: string,
    onChunk?: (delta: string) => void
  ): Promise<ChatbotResponse> {
    const trimmedMessage = message.trim();

    // 1. Fetch previous session history from Redis (up to 10 messages)
    const history = await this.repo.getSessionHistory(sessionId, 10);

    // 2. Classify intent via IntentRouterService
    const intent = await this.routerService.classifyIntent(trimmedMessage);

    // 3. Retrieve context data according to intent
    const retrieval = await this.retrievalService.retrieveContext(
      intent,
      trimmedMessage,
      orderSessionToken
    );

    // 4. Generate response via Claude Sonnet or fallback
    let replyText = '';
    const waUrl = this.getWhatsAppHandoffUrl(`Halo Admin AlloBook, terkait pertanyaan: "${trimmedMessage.slice(0, 80)}"`);

    if (this.anthropic) {
      replyText = await this.generateWithClaude(
        trimmedMessage,
        history,
        retrieval,
        waUrl,
        onChunk
      );
    } else {
      replyText = this.generateFallbackResponse(intent, trimmedMessage, retrieval, waUrl);
      if (onChunk) {
        onChunk(replyText);
      }
    }

    // 5. Save user message and assistant reply to Redis session history
    await this.repo.saveMessageToHistory(sessionId, {
      role: 'user',
      content: trimmedMessage,
    });
    await this.repo.saveMessageToHistory(sessionId, {
      role: 'assistant',
      content: replyText,
    });

    return {
      reply: replyText,
      intent,
      suggestedBooks:
        intent === 'book_recommendation' && !replyText.includes('di luar katalog')
          ? retrieval.suggestedBooks
          : [],
      requiresOrderVerification: intent === 'order_status' && !retrieval.isOrderVerified,
      orderSummary: retrieval.orderSummary,
      whatsAppHandoffUrl: replyText.toLowerCase().includes('whatsapp') ? waUrl : undefined,
    };
  }

  private async generateWithClaude(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    retrieval: RetrievalResult,
    waUrl: string,
    onChunk?: (delta: string) => void
  ): Promise<string> {
    const systemPrompt = `Anda adalah "AlloBot", asisten kurator buku virtual yang ramah, hangat, dan berwawasan luas dari AlloBook.
Persona Anda: Dekat dengan alam, peduli pada tumbuh kembang, imajinasi, dan emosi anak (sebagaimana nuansa toko buku kurasi AlloBook di Instagram). Nada bicara santun, hangat, suportif, dan bersahabat — bukan jawaban kaku layaknya robot customer service generik.

ATURAN DAN GUARDRAILS KETAT (WAJIB DIPATUHI TANPA PENGECUALIAN):
1. HANYA jawab berdasarkan data yang terdapat di dalam [KONTEKS TERPERIKSA] di bawah.
2. JANGAN PERNAH mengarang data: Jika informasi (seperti judul buku tertentu, harga, ketersediaan stok, nomor resi) tidak tercantum di konteks, atau jika pertanyaan berada di luar topik (misal politik, gosip, atau konsultasi medis klinis), JAWAB DENGAN JUJUR DAN SOPAN:
   "Saya belum punya info pasti soal itu, mau saya sambungkan ke admin AlloBook via WhatsApp?"
   Sertakan rujukan WhatsApp Admin: ${waUrl}
3. LARANGAN EKSPLISIT:
   - Jangan menyebutkan harga atau stok buku yang tidak tertulis di konteks.
   - Jangan mengonfirmasi status pesanan tanpa konteks [DATA PESANAN TERVERIFIKASI]. Jika konteks menyatakan belum terverifikasi, sampaikan bahwa demi keamanan data, pengguna perlu mengisi Nomor Pesanan & WhatsApp di formulir verifikasi.
   - Jangan menjawab sebagai otoritas medis/psikologis klinis. Untuk pertanyaan kesehatan anak, arahkan ke dokter atau profesional terkait.
4. BATASAN PARENTING: Anda boleh berdiskusi ringan mengenai membaca nyaring (read aloud), tips menumbuhkan rasa cinta buku, dan pemilihan buku sesuai usia (0-3 board book, 4-6 picture book, 7-12 early reader), tetapi bukan diagnosa psikologis anak.
5. Gunakan Bahasa Indonesia yang natural, hangat, dan enak dibaca. Batasi jawaban maksimal 200 kata agar ringkas dan nyaman.

[KONTEKS TERPERIKSA]
Kategori Intent: ${retrieval.intent}
Status Verifikasi Pesanan: ${retrieval.isOrderVerified ? 'TERVERIFIKASI' : 'BELUM TERVERIFIKASI'}
Data Sumber:
${retrieval.contextText}`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Include last 8 history messages for coherent context window
    const recent = history.slice(-8);
    for (const h of recent) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: message });

    try {
      if (onChunk) {
        // Streaming mode (SSE)
        const stream = await this.anthropic!.messages.create({
          model: this.reasoningModel,
          max_tokens: 500,
          system: systemPrompt,
          messages,
          stream: true,
        });

        let fullText = '';
        let inputTokens = 0;
        let outputTokens = 0;

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullText += chunk.delta.text;
            onChunk(chunk.delta.text);
          }
          if (chunk.type === 'message_start' && (chunk.message as any)?.usage) {
            inputTokens = (chunk.message as any).usage.input_tokens || 0;
          }
          if (chunk.type === 'message_delta' && (chunk as any)?.usage) {
            outputTokens = (chunk as any).usage.output_tokens || 0;
          }
        }

        // Log AI Usage asynchronously
        const totalTokens = (inputTokens || 120) + (outputTokens || Math.ceil(fullText.length / 4));
        const estimatedCost = (inputTokens || 120) * 0.000003 + (outputTokens || 80) * 0.000015;

        await this.repo.saveMessageToHistory('usage-log', {
          role: 'assistant',
          content: `tokens:${totalTokens}`,
        }).catch(() => {});

        return fullText.trim();
      } else {
        // Standard complete mode
        const response = await this.anthropic!.messages.create({
          model: this.reasoningModel,
          max_tokens: 500,
          system: systemPrompt,
          messages,
        });

        const textBlock = response.content.find((c) => c.type === 'text');
        const text = textBlock ? textBlock.text.trim() : '';

        return text;
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Claude Sonnet chatbot invocation failed, using fallback');
      return this.generateFallbackResponse(retrieval.intent, message, retrieval, waUrl);
    }
  }

  private generateFallbackResponse(
    intent: string,
    message: string,
    retrieval: RetrievalResult,
    waUrl: string
  ): string {
    const lower = message.toLowerCase();

    // Guardrail: Out of domain detection (politics, sports scores, medical diagnosis)
    const outOfDomainKeywords = ['presiden', 'pilkada', 'politik', 'menteri', 'obat', 'penyakit', 'vaksin', 'resep dokter'];
    if (outOfDomainKeywords.some((kw) => lower.includes(kw))) {
      return (
        'Saya adalah AlloBot, asisten kurator buku anak dan toko buku AlloBook. ' +
        'Saya belum punya info pasti soal topik tersebut di luar katalog dan layanan buku kami. ' +
        `Jika Anda memerlukan bantuan khusus dari tim kami, Anda dapat langsung menghubungi [Admin AlloBook via WhatsApp](${waUrl}).`
      );
    }

    if (intent === 'order_status') {
      if (!retrieval.isOrderVerified) {
        return (
          'Demi keamanan dan privasi data Anda, status pesanan hanya dapat diakses setelah verifikasi. ' +
          'Silakan masukkan Nomor Pesanan (Order ID) dan Nomor WhatsApp yang Anda gunakan saat pemesanan pada formulir verifikasi.'
        );
      }
      return (
        `Berikut adalah status pesanan Anda:\n\n${retrieval.contextText}\n\n` +
        'Jika ada kendala dalam proses pengiriman, tim kurator kami siap mendampingi Anda via WhatsApp.'
      );
    }

    if (intent === 'store_faq') {
      if (retrieval.matchedFaqs.length > 0) {
        const topFaq = retrieval.matchedFaqs[0];
        return (
          `Terkait pertanyaan Anda: **${topFaq.question}**\n\n` +
          `${topFaq.answer}\n\n` +
          `Apakah ada informasi lain seputar pre-order atau pengiriman yang ingin Anda tanyakan?`
        );
      }
      return (
        'Untuk pemesanan buku Pre-Order di AlloBook, Anda dapat memilih judul berlabel PO dan memesan melalui WhatsApp Concierge kami. ' +
        `Pelacakan status pesanan meliputi PENDING → PROCESSING → CONFIRMED → SHIPPED → DONE. Mau saya hubungkan ke [Admin WhatsApp](${waUrl})?`
      );
    }

    if (intent === 'general_parenting') {
      return (
        'Membaca bersama anak adalah momen istimewa untuk merekatkan kelekatan batin (bonding) dan melatih kepekaan emosi mereka. ' +
        'Untuk balita (0-3 tahun), pilihlah board book bertekstur sensori. Untuk anak usia 4-6 tahun, picture book bertema alam dan persahabatan sangat dianjurkan. ' +
        'Cukup 10–15 menit membaca nyaring setiap hari dengan nada yang menyenangkan!'
      );
    }

    // Default book recommendation
    if (retrieval.suggestedBooks.length > 0) {
      const titles = retrieval.suggestedBooks.map((b) => `• **${b.title}** oleh ${b.author} (Rp ${b.price.toLocaleString('id-ID')})`).join('\n');
      return (
        'Tentu! Berikut beberapa koleksi buku kurasi pilihan AlloBook yang sangat relevan untuk Anda:\n\n' +
        `${titles}\n\n` +
        'Anda dapat melihat sinopsis lengkap melalui kartu buku di bawah ini.'
      );
    }

    return (
      'Halo! Saya AlloBot dari AlloBook. Ada yang bisa saya bantu terkait rekomendasi buku anak, alur pre-order via WhatsApp, atau kebijakan toko?'
    );
  }
}
