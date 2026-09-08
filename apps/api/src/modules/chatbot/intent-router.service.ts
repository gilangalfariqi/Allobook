import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '../../config/env';
import { ChatIntent, CHAT_INTENTS } from './chatbot.schema';
import { logger } from '../../lib/logger';

export class IntentRouterService {
  private anthropic: Anthropic | null = null;
  private readonly routerModel = 'claude-3-5-haiku-20241022';

  constructor() {
    const apiKey = getEnv().ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  async classifyIntent(message: string): Promise<ChatIntent> {
    const trimmed = message.trim();
    if (!trimmed) return 'book_recommendation';

    // 1. Try lightweight LLM classification if Anthropic is configured
    if (this.anthropic) {
      try {
        const prompt = `Tugas Anda adalah mengklasifikasikan pertanyaan atau pesan pengguna ke SALAH SATU dari 4 label intent berikut:
1. book_recommendation : Mencari buku, rekomendasi judul, buku sesuai usia/topik/tema (contoh: "buku alam untuk anak 4 tahun", "rekomendasi fiksi").
2. order_status : Menanyakan status pesanan, paket pengiriman, resi, cek order ID (contoh: "status pesanan saya gimana?", "apakah paket sudah dikirim?").
3. store_faq : Menanyakan kebijakan toko, cara pre-order via WA, pembayaran, retur, komplain, ongkir (contoh: "gimana cara PO?", "apakah bisa retur?", "metode pembayaran apa saja?").
4. general_parenting : Diskusi seputar tips membaca anak, read-aloud, menumbuhkan minat baca (contoh: "cara membiasakan balita suka buku").

Pesan pengguna: "${trimmed}"

Kembalikan HANYA nama label di atas (persis salah satu dari: book_recommendation, order_status, store_faq, general_parenting). Jangan menambahkan kata lain.`;

        const response = await this.anthropic.messages.create({
          model: this.routerModel,
          max_tokens: 20,
          messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content
          .filter((c) => c.type === 'text')
          .map((c) => (c as any).text)
          .join('')
          .trim()
          .toLowerCase();

        for (const intent of CHAT_INTENTS) {
          if (text.includes(intent)) {
            return intent;
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Intent classification LLM failed, using regex fallback');
      }
    }

    // 2. Rule-based regex fallback
    return this.classifyByRules(trimmed);
  }

  classifyByRules(message: string): ChatIntent {
    const lower = message.toLowerCase();

    const matchesWordOrPhrase = (kw: string): boolean => {
      if (kw.length <= 4) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i').test(lower);
      }
      return lower.includes(kw);
    };

    // Intent: order_status
    const orderKeywords = [
      'status pesanan',
      'pesanan saya',
      'order saya',
      'lacak',
      'tracking',
      'resi',
      'paket saya',
      'sudah dikirim',
      'kapan sampai',
      'cek pesanan',
      'cek order',
    ];
    if (orderKeywords.some(matchesWordOrPhrase)) {
      return 'order_status';
    }

    // Intent: store_faq
    const faqKeywords = [
      'cara po',
      'pre-order',
      'preorder',
      'cara pesan',
      'cara beli',
      'retur',
      'komplain',
      'cacat',
      'unboxing',
      'ongkir',
      'ekspedisi',
      'kurir',
      'bayar',
      'pembayaran',
      'transfer',
      'rekening',
      'jam buka',
      'jam operasional',
      'titip pesan',
      'request buku',
      'guest checkout',
    ];
    if (faqKeywords.some(matchesWordOrPhrase)) {
      return 'store_faq';
    }

    // Intent: general_parenting
    const parentingKeywords = [
      'parenting',
      'membaca nyaring',
      'read aloud',
      'minat baca',
      'kebiasaan membaca',
      'anak susah baca',
      'tips membaca',
      'tumbuh kembang anak',
      'emosi anak',
      'usia berapa mulai',
    ];
    if (parentingKeywords.some(matchesWordOrPhrase)) {
      return 'general_parenting';
    }

    // Default to book recommendation
    return 'book_recommendation';
  }
}
