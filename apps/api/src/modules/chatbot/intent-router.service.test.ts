import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentRouterService } from './intent-router.service';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    ANTHROPIC_API_KEY: 'mock-key',
  })),
}));

describe('IntentRouterService', () => {
  let router: IntentRouterService;

  beforeEach(() => {
    vi.clearAllMocks();
    router = new IntentRouterService();
  });

  describe('classifyIntent with LLM response', () => {
    it('should parse book_recommendation intent from Claude', async () => {
      (router as any).anthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'book_recommendation' }],
          }),
        },
      };

      const intent = await router.classifyIntent('Buku apa yang cocok untuk anak usia 4 tahun tentang alam?');
      expect(intent).toBe('book_recommendation');
    });

    it('should parse order_status intent from Claude', async () => {
      (router as any).anthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'order_status' }],
          }),
        },
      };

      const intent = await router.classifyIntent('Status pesanan saya gimana?');
      expect(intent).toBe('order_status');
    });

    it('should parse store_faq intent from Claude', async () => {
      (router as any).anthropic = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'store_faq' }],
          }),
        },
      };

      const intent = await router.classifyIntent('Gimana cara PO buku?');
      expect(intent).toBe('store_faq');
    });
  });

  describe('classifyByRules (Fallback Regex)', () => {
    it('should classify order related messages to order_status', () => {
      expect(router.classifyByRules('Status pesanan saya sudah sampai mana?')).toBe('order_status');
      expect(router.classifyByRules('Cek resi paket saya')).toBe('order_status');
      expect(router.classifyByRules('Kapan pesanan saya dikirim?')).toBe('order_status');
    });

    it('should classify store FAQ messages to store_faq', () => {
      expect(router.classifyByRules('Gimana cara PO via WhatsApp?')).toBe('store_faq');
      expect(router.classifyByRules('Apakah bisa retur barang cacat?')).toBe('store_faq');
      expect(router.classifyByRules('Berapa ongkir ke Surabaya?')).toBe('store_faq');
      expect(router.classifyByRules('Bisa bayar DP dulu?')).toBe('store_faq');
    });

    it('should classify parenting advice messages to general_parenting', () => {
      expect(router.classifyByRules('Tips membaca nyaring untuk balita')).toBe('general_parenting');
      expect(router.classifyByRules('Bagaimana membangun minat baca anak di rumah?')).toBe('general_parenting');
    });

    it('should default book query messages to book_recommendation', () => {
      expect(router.classifyByRules('Buku cerita petualangan seru')).toBe('book_recommendation');
      expect(router.classifyByRules('Ada novel fiksi terbitan terbaru?')).toBe('book_recommendation');
    });
  });
});
