'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  useChatStore,
  SuggestedBook,
  ChatMessage,
  OrderSummary,
} from '@/stores/chat.store';

const QUICK_PROMPTS = [
  '🌱 Buku alam untuk anak 4 tahun',
  '📦 Status pesanan saya gimana?',
  '💬 Gimana cara pre-order buku di AlloBook?',
  '📖 Tips membiasakan anak suka membaca',
];

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200';

function formatStatus(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Menunggu Verifikasi', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    PROCESSING: { label: 'Sedang Disiapkan', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    CONFIRMED: { label: 'Terkonfirmasi', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    SHIPPED: { label: 'Dalam Pengiriman', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    DELIVERED: { label: 'Terkirim', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    DONE: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    CANCELLED: { label: 'Dibatalkan', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  };
  return map[status] || { label: status, color: 'bg-stone-100 text-stone-800 border-stone-300' };
}

/** Render simple markdown text (bold, bullet lists, markdown links) safely */
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />;
        }

        // Render bullet line
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;

        // Parse bold & markdown links in line
        const parts = [];
        let cursor = 0;
        const regex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)/g;
        let match;

        while ((match = regex.exec(cleanLine)) !== null) {
          if (match.index > cursor) {
            parts.push(cleanLine.substring(cursor, match.index));
          }
          if (match[1]) {
            // Markdown link: [text](url)
            parts.push(
              <a
                key={match.index}
                href={match[3]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:text-emerald-800 font-semibold underline decoration-emerald-500/50 underline-offset-2"
              >
                {match[2]}
              </a>
            );
          } else if (match[4]) {
            // Bold: **text**
            parts.push(
              <strong key={match.index} className="font-semibold text-[#1a1c1b]">
                {match[5]}
              </strong>
            );
          }
          cursor = regex.lastIndex;
        }
        if (cursor < cleanLine.length) {
          parts.push(cleanLine.substring(cursor));
        }

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-emerald-600 font-bold text-xs mt-0.5">•</span>
              <span className="flex-1">{parts}</span>
            </div>
          );
        }

        return <p key={idx}>{parts}</p>;
      })}
    </div>
  );
}

/** Inline verification component for secure order status queries */
function InlineOrderVerification() {
  const { verifyOrder } = useChatStore();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim() || verifying) return;

    setVerifying(true);
    setErrorMsg(null);

    const result = await verifyOrder(orderId.trim(), phone.trim());
    setVerifying(false);

    if (!result.success) {
      setErrorMsg(result.message || 'Verifikasi gagal. Pastikan data pesanan valid.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-3 bg-[#f3f7f4] border border-emerald-200 rounded-xl space-y-2 text-xs"
    >
      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
        <span className="material-symbols-outlined text-sm">verified_user</span>
        <span>Verifikasi Kepemilikan Pesanan</span>
      </div>
      <p className="text-[11px] text-[#4a5c53]">
        Data pesanan hanya dapat diakses dengan mencocokkan nomor pesanan dan WhatsApp Anda.
      </p>

      <div className="space-y-1.5 pt-1">
        <div>
          <label className="block text-[10px] font-medium text-[#4a5c53] mb-0.5">
            Nomor Pesanan (Order ID)
          </label>
          <input
            type="text"
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Contoh: cmtr... atau ORD-..."
            className="w-full px-2.5 py-1.5 bg-white border border-[#c1c8c6] rounded-lg text-xs outline-none focus:border-emerald-600"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-[#4a5c53] mb-0.5">
            Nomor WhatsApp Terdaftar
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Contoh: 081234567890"
            className="w-full px-2.5 py-1.5 bg-white border border-[#c1c8c6] rounded-lg text-xs outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px]">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={verifying || !orderId.trim() || !phone.trim()}
        className="w-full py-2 bg-[#1b3b2b] hover:bg-[#142e21] text-white rounded-lg font-medium text-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
      >
        {verifying ? (
          <>
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Memverifikasi...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-xs">lock_open</span>
            <span>Cek Status Pesanan Saya</span>
          </>
        )}
      </button>
    </form>
  );
}

/** Verified order status summary card */
function OrderSummaryCard({ order }: { order: OrderSummary }) {
  const statusInfo = formatStatus(order.status);

  return (
    <div className="mt-3 p-3 bg-white border border-emerald-300/80 rounded-xl shadow-xs space-y-2 text-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
        <span className="font-mono text-[10px] text-stone-500 truncate max-w-[170px]">
          ID: {order.orderId}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      <div className="space-y-1 text-[11px] text-[#4a5c53]">
        <div className="flex justify-between">
          <span>Pemesan:</span>
          <span className="font-semibold text-stone-900">{order.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span>Nomor WhatsApp:</span>
          <span className="font-mono text-stone-900">{order.customerPhone}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Pembayaran:</span>
          <span className="font-bold text-emerald-800">
            Rp {Number(order.totalAmount).toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {order.items && order.items.length > 0 && (
        <div className="pt-1.5 border-t border-stone-100">
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
            Buku yang Dipesan:
          </p>
          <ul className="space-y-1">
            {order.items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between text-[11px] text-stone-800"
              >
                <span className="truncate pr-2">• {item.bookTitle}</span>
                <span className="text-stone-500 flex-shrink-0">x{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ChatbotWidget() {
  const {
    isOpen,
    toggleOpen,
    setOpen,
    messages,
    isStreaming,
    sendMessage,
    resetSession,
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isStreaming) return;
    setInputMessage('');
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside
      aria-label="AlloBot Virtual Curator"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 font-sans"
    >
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-[#1b3b2b] text-white rounded-full shadow-xl hover:bg-[#142e21] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          aria-label="Buka Chatbot AlloBot"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="material-symbols-outlined text-lg">smart_toy</span>
          <span className="text-xs font-semibold tracking-wide">Tanya AlloBot</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-medium">
            AI
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[390px] md:w-[420px] h-[550px] max-h-[85vh] bg-white border border-[#c1c8c6]/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-4 py-3 bg-[#1b3b2b] text-white flex items-center justify-between border-b border-white/10 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300">
                <span className="material-symbols-outlined text-xl">smart_toy</span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#1b3b2b] rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold font-serif tracking-wide">AlloBot</h3>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.2 rounded font-medium">
                    Claude 4.6
                  </span>
                </div>
                <p className="text-[10px] text-white/70">Kurator Buku &amp; Layanan Pelanggan</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={resetSession}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Mulai Percakapan Baru"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Tutup Chat"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#faf9f7]/70">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-[#1b3b2b] text-white rounded-tr-xs'
                      : 'bg-white text-[#1a1c1b] border border-[#c1c8c6]/40 rounded-tl-xs'
                  }`}
                >
                  {/* Message Content */}
                  {msg.content ? (
                    <FormattedText text={msg.content} />
                  ) : isStreaming ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-1.5 h-1.5 bg-[#1b3b2b] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-[#1b3b2b] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-[#1b3b2b] rounded-full animate-bounce"></span>
                    </div>
                  ) : null}

                  {/* Inline Order Verification Form */}
                  {msg.requiresOrderVerification && <InlineOrderVerification />}

                  {/* Verified Order Summary Card */}
                  {msg.orderSummary && <OrderSummaryCard order={msg.orderSummary} />}

                  {/* Suggested Books Carousel/Grid */}
                  {msg.suggestedBooks && msg.suggestedBooks.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#c1c8c6]/30 space-y-2">
                      <p className="text-[10px] font-semibold text-[#5a6b63] uppercase tracking-wider">
                        Rekomendasi Buku Terpilih:
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {msg.suggestedBooks.map((book) => (
                          <Link
                            key={book.id}
                            href={`/books/${book.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 p-1.5 bg-[#f4f3f1] hover:bg-emerald-50/60 border border-[#c1c8c6]/30 rounded-lg transition-colors group"
                          >
                            <div className="relative w-8 h-11 rounded overflow-hidden flex-shrink-0 bg-white border border-stone-200">
                              <Image
                                src={book.coverUrl || DEFAULT_COVER}
                                alt={book.title}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[11px] text-[#1a1c1b] group-hover:text-emerald-800 truncate">
                                {book.title}
                              </p>
                              <p className="text-[10px] text-[#717977] truncate">
                                {book.author}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold text-[#1b3b2b]">
                                  Rp {Number(book.price).toLocaleString('id-ID')}
                                </span>
                                {book.isPreOrder && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-medium">
                                    PO
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-xs text-[#717977] group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-transform">
                              arrow_forward
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Handoff Button */}
                  {msg.whatsAppHandoffUrl && (
                    <div className="mt-3 pt-2 border-t border-[#c1c8c6]/30">
                      <a
                        href={msg.whatsAppHandoffUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg font-medium text-xs transition-colors shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span>Hubungi Kurator via WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick Prompts (shown on initial screen or idle) */}
            {messages.length <= 2 && !isStreaming && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] font-medium text-[#717977]">Pertanyaan Populer:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(prompt)}
                      className="text-[11px] text-left px-2.5 py-1 bg-white hover:bg-emerald-50 text-[#1b3b2b] border border-[#c1c8c6]/50 hover:border-emerald-500/50 rounded-full transition-colors shadow-2xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-2.5 bg-white border-t border-[#c1c8c6]/30 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan buku, parenting, atau status pesanan..."
                disabled={isStreaming}
                className="flex-1 text-xs px-3.5 py-2.5 bg-[#f4f3f1] border border-transparent focus:border-emerald-700 focus:bg-white rounded-full outline-none transition-all placeholder:text-[#717977]"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isStreaming}
                className="p-2.5 bg-[#1b3b2b] text-white rounded-full hover:bg-[#142e21] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0 flex items-center justify-center"
                aria-label="Kirim Pesan"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
