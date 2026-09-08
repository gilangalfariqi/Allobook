import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface SuggestedBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  price: number;
  coverUrl?: string | null;
  isPreOrder?: boolean;
}

export interface OrderItemSummary {
  bookTitle: string;
  quantity: number;
  price: number;
}

export interface OrderSummary {
  orderId: string;
  customerName: string;
  customerPhone: string;
  status: string;
  totalAmount: number;
  shippingAddress: any;
  items: OrderItemSummary[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  suggestedBooks?: SuggestedBook[];
  requiresOrderVerification?: boolean;
  orderSummary?: OrderSummary;
  whatsAppHandoffUrl?: string;
}

interface ChatStore {
  isOpen: boolean;
  sessionId: string;
  orderSessionToken: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setOrderSessionToken: (token: string | null) => void;
  verifyOrder: (
    orderIdOrPhone: string,
    customerPhone: string
  ) => Promise<{ success: boolean; message?: string }>;
  sendMessage: (text: string) => Promise<void>;
  resetSession: () => void;
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Halo! Saya **AlloBot**, asisten kurator buku virtual Anda di AlloBook. Ada rekomendasi buku ramah anak, pertanyaan seputar toko, atau status pesanan yang ingin Anda tanyakan?',
  },
];

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      sessionId: generateSessionId(),
      orderSessionToken: null,
      messages: INITIAL_MESSAGES,
      isStreaming: false,
      error: null,

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open: boolean) => set({ isOpen: open }),

      setOrderSessionToken: (token: string | null) =>
        set({ orderSessionToken: token }),

      resetSession: () =>
        set({
          sessionId: generateSessionId(),
          orderSessionToken: null,
          messages: INITIAL_MESSAGES,
          isStreaming: false,
          error: null,
        }),

      verifyOrder: async (orderIdOrPhone: string, customerPhone: string) => {
        try {
          const res = await fetch(`${API_URL}/chatbot/verify-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIdOrPhone, customerPhone }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            return {
              success: false,
              message:
                data.message ||
                'Verifikasi pesanan tidak berhasil. Pastikan Order ID dan nomor WhatsApp sesuai.',
            };
          }

          set({ orderSessionToken: data.orderSessionToken });

          // Automatically send a follow-up query with verified token
          await get().sendMessage('Lihat rincian status pesanan saya');

          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            message: err.message || 'Gagal menghubungi server verifikasi.',
          };
        }
      },

      sendMessage: async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || get().isStreaming) return;

        const currentSessionId = get().sessionId || generateSessionId();
        const userMsgId = `user-${Date.now()}`;
        const botMsgId = `bot-${Date.now()}`;

        const userMsg: ChatMessage = {
          id: userMsgId,
          role: 'user',
          content: trimmed,
        };

        const botPlaceholder: ChatMessage = {
          id: botMsgId,
          role: 'assistant',
          content: '',
        };

        set((state) => ({
          sessionId: currentSessionId,
          messages: [...state.messages, userMsg, botPlaceholder],
          isStreaming: true,
          error: null,
        }));

        try {
          const token = get().orderSessionToken;
          const response = await fetch(`${API_URL}/chatbot/message?stream=true`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
            body: JSON.stringify({
              sessionId: currentSessionId,
              message: trimmed,
              orderSessionToken: token || undefined,
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error(
              errData?.message || `HTTP Error ${response.status} saat menghubungi chatbot.`
            );
          }

          if (
            response.headers.get('content-type')?.includes('text/event-stream') &&
            response.body
          ) {
            // Read SSE stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let accumulatedText = '';
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine.startsWith('data:')) continue;
                const jsonStr = trimmedLine.replace(/^data:\s*/, '');
                if (!jsonStr) continue;

                try {
                  const event = JSON.parse(jsonStr);

                  if (event.type === 'delta' && event.text) {
                    accumulatedText += event.text;
                    set((state) => ({
                      messages: state.messages.map((m) =>
                        m.id === botMsgId
                          ? { ...m, content: accumulatedText }
                          : m
                      ),
                    }));
                  } else if (event.type === 'done') {
                    set((state) => ({
                      messages: state.messages.map((m) =>
                        m.id === botMsgId
                          ? {
                              ...m,
                              content: accumulatedText || m.content,
                              intent: event.intent,
                              suggestedBooks: event.suggestedBooks || [],
                              requiresOrderVerification:
                                event.requiresOrderVerification,
                              orderSummary: event.orderSummary,
                              whatsAppHandoffUrl: event.whatsAppHandoffUrl,
                            }
                          : m
                      ),
                    }));
                  } else if (event.type === 'error') {
                    throw new Error(event.message || 'Kesalahan saat streaming.');
                  }
                } catch {
                  // Ignore JSON parse error on non-json SSE lines
                }
              }
            }
          } else {
            // Fallback for standard JSON responses
            const data = await response.json();
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === botMsgId
                  ? {
                      ...m,
                      content: data.reply || '',
                      intent: data.intent,
                      suggestedBooks: data.suggestedBooks || [],
                      requiresOrderVerification: data.requiresOrderVerification,
                      orderSummary: data.orderSummary,
                      whatsAppHandoffUrl: data.whatsAppHandoffUrl,
                    }
                  : m
              ),
            }));
          }
        } catch (err: any) {
          set((state) => ({
            error: err.message || 'Terjadi kesalahan saat memproses pesan.',
            messages: state.messages.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    content:
                      m.content ||
                      'Maaf, sedang ada kendala jaringan saat menghubungkan ke kurator AlloBot. Silakan coba sesaat lagi.',
                    whatsAppHandoffUrl:
                      'https://wa.me/6281234567890?text=Halo%20Admin%20AlloBook%2C%20saya%20mengalami%20kendala%20di%20website',
                  }
                : m
            ),
          }));
        } finally {
          set({ isStreaming: false });
        }
      },
    }),
    {
      name: 'allobook-chat-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        orderSessionToken: state.orderSessionToken,
        messages: state.messages.slice(-20), // Persist last 20 messages
      }),
    }
  )
);
