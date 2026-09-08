import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatbotService } from './chatbot.service';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    ANTHROPIC_API_KEY: 'test-key',
    WHATSAPP_NUMBER: '6281234567890',
  })),
}));

describe('ChatbotService (RAG & Guardrails)', () => {
  let service: ChatbotService;
  let mockRouter: any;
  let mockRetrieval: any;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRouter = {
      classifyIntent: vi.fn().mockResolvedValue('book_recommendation'),
    };

    mockRetrieval = {
      retrieveContext: vi.fn().mockResolvedValue({
        intent: 'book_recommendation',
        contextText: 'Buku Sapiens oleh Yuval Noah Harari',
        suggestedBooks: [
          {
            id: 'b1',
            slug: 'sapiens',
            title: 'Sapiens',
            author: 'Yuval Noah Harari',
            price: 150000,
            stock: 10,
            isPreOrder: false,
          },
        ],
        matchedFaqs: [],
        isOrderVerified: false,
      }),
    };

    mockRepo = {
      getSessionHistory: vi.fn().mockResolvedValue([]),
      saveMessageToHistory: vi.fn().mockResolvedValue(undefined),
    };

    service = new ChatbotService(mockRouter, mockRetrieval, mockRepo);
  });

  describe('Guardrails & Out-of-Domain Detection', () => {
    it('should politely decline out-of-domain questions and offer WhatsApp handoff', async () => {
      // Test fallback guardrail
      (service as any).anthropic = null;
      mockRouter.classifyIntent.mockResolvedValue('book_recommendation');

      const response = await service.processMessage(
        'Siapa nama presiden Indonesia?',
        'session-1'
      );

      expect(response.reply).toContain('Saya adalah AlloBot');
      expect(response.reply).toContain('di luar katalog dan layanan buku');
      expect(response.reply).toContain('WhatsApp');
      expect(response.whatsAppHandoffUrl).toBeDefined();
    });
  });

  describe('Order Status Verification Guardrail', () => {
    it('should require order verification if orderSessionToken is missing', async () => {
      (service as any).anthropic = null;
      mockRouter.classifyIntent.mockResolvedValue('order_status');
      mockRetrieval.retrieveContext.mockResolvedValue({
        intent: 'order_status',
        contextText: '[KEAMANAN PESANAN: Belum terverifikasi]',
        suggestedBooks: [],
        matchedFaqs: [],
        isOrderVerified: false,
      });

      const response = await service.processMessage(
        'Status pesanan saya gimana?',
        'session-1'
      );

      expect(response.requiresOrderVerification).toBe(true);
      expect(response.reply).toContain('verifikasi');
      expect(response.reply).toContain('Nomor Pesanan');
      expect(response.orderSummary).toBeUndefined();
    });

    it('should display order details when verified with token', async () => {
      (service as any).anthropic = null;
      mockRouter.classifyIntent.mockResolvedValue('order_status');
      mockRetrieval.retrieveContext.mockResolvedValue({
        intent: 'order_status',
        contextText: 'Order ID: ORD-999\nStatus: SHIPPED\nTotal: Rp 150.000',
        suggestedBooks: [],
        matchedFaqs: [],
        isOrderVerified: true,
        orderSummary: { id: 'ORD-999', status: 'SHIPPED', totalAmount: 150000 },
      });

      const response = await service.processMessage(
        'Kapan sampai paket saya?',
        'session-1',
        'valid-order-session-token'
      );

      expect(response.requiresOrderVerification).toBe(false);
      expect(response.reply).toContain('ORD-999');
      expect(response.reply).toContain('SHIPPED');
      expect(response.orderSummary).toBeDefined();
    });
  });

  describe('FAQ Knowledge Base Retrieval', () => {
    it('should answer from FAQ context when intent is store_faq', async () => {
      (service as any).anthropic = null;
      mockRouter.classifyIntent.mockResolvedValue('store_faq');
      mockRetrieval.retrieveContext.mockResolvedValue({
        intent: 'store_faq',
        contextText: 'FAQ 1: Cara PO',
        suggestedBooks: [],
        matchedFaqs: [
          {
            id: 'faq-1',
            question: 'Bagaimana cara melakukan Pre-Order (PO) di AlloBook?',
            answer: 'Pilih buku berlabel Pre-Order, lalu hubungi WhatsApp Concierge.',
            category: 'checkout',
          },
        ],
        isOrderVerified: false,
      });

      const response = await service.processMessage(
        'Gimana cara PO?',
        'session-1'
      );

      expect(response.reply).toContain('Pre-Order');
      expect(response.reply).toContain('WhatsApp Concierge');
    });
  });
});
