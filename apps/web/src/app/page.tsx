import Link from 'next/link';
import Image from 'next/image';
import { BookCard } from '@/components/book-card';
import { apiClient } from '@/lib/api-client';

async function getHomeData() {
  try {
    const [booksData, preOrderData] = await Promise.all([
      apiClient<{ items: any[] }>('/books?limit=8&sort=newest').catch(() => ({ items: [] })),
      apiClient<{ items: any[] }>('/books?limit=4&isPreOrder=true').catch(() => ({ items: [] })),
    ]);

    return {
      featuredBooks: booksData.items || [],
      preOrderBooks: preOrderData.items || [],
    };
  } catch {
    return { featuredBooks: [], preOrderBooks: [] };
  }
}

export default async function HomePage() {
  const { featuredBooks, preOrderBooks } = await getHomeData();

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#001915] text-[#faf9f7] py-20 sm:py-28">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#c8e9e3_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl space-y-6">
            <span className="inline-block text-xs uppercase tracking-widest font-semibold text-[#fed65b] bg-[#3e2219]/60 px-3 py-1 rounded-full">
              Kurasi Literatur Pilihan
            </span>
            <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight leading-tight text-white">
              The Library of <br />
              <span className="italic font-normal text-[#adcdc7]">Curious Minds.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#c1c8c6] leading-relaxed font-sans">
              Temukan buku-buku berharga yang memperluas cakrawala berpikir Anda. Nikmati kemudahan
              pre-order judul langka dan edisi khusus dengan bantuan WhatsApp Concierge kami.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="/books"
                className="px-6 py-3 rounded-md bg-[#c8e9e3] text-[#00201c] font-semibold text-sm hover:bg-[#adcdc7] transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <span>Jelajahi Katalog</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
              <Link
                href="/books?isPreOrder=true"
                className="px-6 py-3 rounded-md border border-[#c1c8c6]/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors inline-flex items-center gap-2"
              >
                <span>Pre-Order Terkini</span>
                <span className="material-symbols-outlined text-base">hourglass_top</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Value Propositions ───────────────────────────────────────────── */}
      <section className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-8 bg-[#f4f3f1] border border-[#c1c8c6]/40 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0f2e2a] text-[#779691] rounded-md">
              <span className="material-symbols-outlined text-2xl">chat</span>
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1a1c1b]">WhatsApp Concierge</h3>
              <p className="text-xs text-[#414847] mt-1 leading-relaxed">
                Pemesanan personal langsung dibantu konsultan kami tanpa kerumitan payment gateway.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0f2e2a] text-[#779691] rounded-md">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1a1c1b]">Kurasi Terpercaya</h3>
              <p className="text-xs text-[#414847] mt-1 leading-relaxed">
                Hanya buku original berkualitas tinggi yang dipilih cermat untuk pembaca serius.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0f2e2a] text-[#779691] rounded-md">
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1a1c1b]">Pengiriman Aman</h3>
              <p className="text-xs text-[#414847] mt-1 leading-relaxed">
                Kemasan berlapis ekstra tebal memastikan buku kesayangan tiba dalam kondisi prima.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Catalog Books ───────────────────────────────────────── */}
      <section className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#779691] block mb-1">
              Koleksi Terbaru
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1c1b]">
              Katalog Rekomendasi
            </h2>
          </div>
          <Link
            href="/books"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {featuredBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-[#c1c8c6]/40 rounded-md">
            <span className="material-symbols-outlined text-4xl text-[#717977]">menu_book</span>
            <p className="text-sm text-[#414847] mt-2">Buku sedang dipersiapkan di katalog.</p>
          </div>
        )}
      </section>

      {/* ─── Pre-Order Spotlight Banner ───────────────────────────────────── */}
      <section className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0f2e2a] text-white rounded-lg p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl z-10">
            <span className="bg-[#fed65b] text-[#745c00] text-xs font-bold px-2.5 py-1 rounded">
              Layanan Pre-Order
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
              Ingin Buku Impor atau Edisi Terbatas?
            </h2>
            <p className="text-sm text-[#c1c8c6] leading-relaxed">
              Tim AlloBook siap membantu mencari dan mengamankan alokasi buku yang belum beredar di
              pasar lokal. Cukup pilih bukunya, dan lanjutkan konfirmasi pesanan lewat WhatsApp.
            </p>
            <div className="pt-2">
              <Link
                href="/books?isPreOrder=true"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#fed65b] text-[#745c00] font-bold text-sm hover:bg-[#ffe088] transition-colors shadow"
              >
                <span>Lihat Buku Pre-Order</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="relative w-48 h-64 sm:w-64 sm:h-80 shadow-2xl rounded-sm overflow-hidden border-2 border-white/20">
            <Image
              src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800"
              alt="Buku Pre-Order Pilihan"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
