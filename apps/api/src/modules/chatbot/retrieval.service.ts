import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';
import { ChatIntent } from './chatbot.schema';
import { ChatbotRepository, FaqResult } from './chatbot.repository';
import { EmbeddingService } from '../ai/embedding.service';
import { SimilarBookResult } from '../ai/ai.repository';

export interface RetrievalResult {
  intent: ChatIntent;
  contextText: string;
  suggestedBooks: SimilarBookResult[];
  matchedFaqs: FaqResult[];
  isOrderVerified: boolean;
  orderSummary?: any;
}

export class RetrievalService {
  constructor(
    private repo: ChatbotRepository,
    private embeddingService: EmbeddingService
  ) {}

  async retrieveContext(
    intent: ChatIntent,
    message: string,
    orderSessionToken?: string
  ): Promise<RetrievalResult> {
    switch (intent) {
      case 'book_recommendation':
        return this.retrieveBookRecommendation(message);

      case 'order_status':
        return this.retrieveOrderStatus(orderSessionToken);

      case 'store_faq':
        return this.retrieveStoreFaq(message);

      case 'general_parenting':
        return this.retrieveParentingContext();

      default:
        return this.retrieveBookRecommendation(message);
    }
  }

  private async retrieveBookRecommendation(message: string): Promise<RetrievalResult> {
    let embedding: number[] | null = null;
    try {
      embedding = await this.embeddingService.generateEmbedding(message);
    } catch {
      embedding = null;
    }

    const books = await this.repo.searchBooksForRecommendation(embedding, message, 4);

    const contextText =
      books.length > 0
        ? 'Daftar Buku Relevan di Katalog AlloBook:\n' +
          books
            .map(
              (b, idx) =>
                `${idx + 1}. Judul: "${b.title}" | Penulis: ${b.author} | Harga: Rp ${b.price.toLocaleString(
                  'id-ID'
                )} | Status: ${b.isPreOrder ? 'Pre-Order (PO)' : 'Ready Stock'} (Stok: ${b.stock}) | Sinopsis: ${
                  b.description ? b.description.slice(0, 160) + '...' : '-'
                }`
            )
            .join('\n')
        : 'Tidak ada buku spesifik yang cocok langsung dengan kata kunci pencarian.';

    return {
      intent: 'book_recommendation',
      contextText,
      suggestedBooks: books,
      matchedFaqs: [],
      isOrderVerified: false,
    };
  }

  private async retrieveOrderStatus(orderSessionToken?: string): Promise<RetrievalResult> {
    if (!orderSessionToken) {
      return {
        intent: 'order_status',
        contextText:
          '[KEAMANAN PESANAN: Pengguna belum melakukan verifikasi kepemilikan pesanan. ' +
          'Instruksi Wajib: Jangan menebak atau menampilkan pesanan siapa pun. Sampaikan dengan santun kepada pengguna bahwa demi privasi dan keamanan data, ' +
          'silakan masukkan Nomor Pesanan (Order ID) dan Nomor WhatsApp yang digunakan saat pemesanan melalui tombol/formulir verifikasi di bawah.]',
        suggestedBooks: [],
        matchedFaqs: [],
        isOrderVerified: false,
      };
    }

    try {
      const decoded = jwt.verify(orderSessionToken, getEnv().JWT_SECRET) as {
        type: string;
        orderId: string;
        customerPhone: string;
      };

      if (decoded.type !== 'order_session' || !decoded.orderId) {
        throw new Error('Invalid token scope');
      }

      const order = await this.repo.getOrderDetailsById(decoded.orderId);
      if (!order) {
        return {
          intent: 'order_status',
          contextText:
            '[Pesanan tidak ditemukan di database dengan Order ID tersebut. Arahkan pengguna memeriksa kembali atau hubungi WhatsApp Admin.]',
          suggestedBooks: [],
          matchedFaqs: [],
          isOrderVerified: false,
        };
      }

      const itemsList = order.items
        .map((it) => `- ${it.book.title} (${it.quantity}x @ Rp ${Number(it.priceAtOrder).toLocaleString('id-ID')})`)
        .join('\n');

      const contextText =
        `[DATA PESANAN TERVERIFIKASI]\n` +
        `Order ID: ${order.id}\n` +
        `Nama Pemesan: ${order.customerName}\n` +
        `Nomor WhatsApp: ${order.customerPhone}\n` +
        `Status Pesanan Saat Ini: ${order.status}\n` +
        `Total Pembayaran: Rp ${Number(order.totalAmount).toLocaleString('id-ID')}\n` +
        `Tanggal Pesan: ${new Date(order.createdAt).toLocaleDateString('id-ID', { dateStyle: 'full' })}\n` +
        `Rincian Item:\n${itemsList}\n` +
        `Penjelasan Status:\n` +
        `- PENDING: Menunggu konfirmasi pembayaran/kuota oleh kurator.\n` +
        `- PROCESSING: Pembayaran terkonfirmasi, pesanan sedang disiapkan di gudang.\n` +
        `- CONFIRMED: Barang selesai disiapkan dan dijadwalkan pikap kurir.\n` +
        `- SHIPPED: Paket dalam perjalanan bersama ekspedisi (resi telah dikirim ke WA).\n` +
        `- DONE: Paket telah berhasil diterima pelanggan.`;

      return {
        intent: 'order_status',
        contextText,
        suggestedBooks: [],
        matchedFaqs: [],
        isOrderVerified: true,
        orderSummary: {
          id: order.id,
          customerName: order.customerName,
          status: order.status,
          totalAmount: Number(order.totalAmount),
        },
      };
    } catch {
      return {
        intent: 'order_status',
        contextText:
          '[Token verifikasi pesanan telah kedaluwarsa atau tidak valid (sesi 15 menit). Minta pengguna melakukan verifikasi ulang dengan Nomor Pesanan dan Nomor WhatsApp.]',
        suggestedBooks: [],
        matchedFaqs: [],
        isOrderVerified: false,
      };
    }
  }

  private async retrieveStoreFaq(message: string): Promise<RetrievalResult> {
    let embedding: number[] | null = null;
    try {
      embedding = await this.embeddingService.generateEmbedding(message);
    } catch {
      embedding = null;
    }

    const faqs = await this.repo.findRelevantFaqs(embedding, message, 3);

    const contextText =
      faqs.length > 0
        ? 'Kebijakan & Panduan Resmi Toko AlloBook (Basis FAQ):\n' +
          faqs
            .map(
              (f, i) =>
                `[FAQ ${i + 1}] Kategori: ${f.category}\n` +
                `Pertanyaan: ${f.question}\n` +
                `Jawaban Resmi: ${f.answer}`
            )
            .join('\n\n')
        : 'Tidak ada entri FAQ yang cocok langsung. Gunakan panduan umum toko AlloBook.';

    return {
      intent: 'store_faq',
      contextText,
      suggestedBooks: [],
      matchedFaqs: faqs,
      isOrderVerified: false,
    };
  }

  private retrieveParentingContext(): RetrievalResult {
    const contextText =
      'Panduan Kuratorial Membaca Anak AlloBook:\n' +
      '- Filosofi AlloBook: Membaca bukan sekadar mengeja, melainkan momen merekatkan ikatan batin (bonding) orang tua dan anak, merawat rasa ingin tahu terhadap alam, serta melatih kecerdasan emosional anak.\n' +
      '- Rekomendasi Format Sesuai Tahap Usia:\n' +
      '  * 0 - 3 Tahun: Board book dengan sudut melengkung aman, kontras warna tajam, materi sensori raba (touch & feel), dan pengenalan ritme bahasa sederhana.\n' +
      '  * 4 - 6 Tahun: Picture book (buku bergambar kaya warna) bertema alam sekitar, hewan, emosi (marah, sedih, empati), dan keseharian.\n' +
      '  * 7 - 12 Tahun: Buku cerita bergambar transisi (early chapter book), ensiklopedia sains bergambar, dongeng budaya, dan sastra fiksi anak.\n' +
      '- Tips Membaca Nyaring (Read Aloud): Cukup 10-15 menit sehari, gunakan intonasi ekspresif, ajak anak menunjuk gambar, dan jangan memaksa bila anak sedang lelah.';

    return {
      intent: 'general_parenting',
      contextText,
      suggestedBooks: [],
      matchedFaqs: [],
      isOrderVerified: false,
    };
  }
}
