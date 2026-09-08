'use client';

import { useCartStore } from '@/stores/cart.store';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalItems } =
    useCartStore();

  const defaultCover =
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300';

  if (items.length === 0) {
    return (
      <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#f4f3f1] text-[#717977] flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-3xl">shopping_bag</span>
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#1a1c1b]">
          Keranjang Belanja Masih Kosong
        </h1>
        <p className="text-xs text-[#414847] max-w-sm mx-auto">
          Jelajahi berbagai judul buku terpilih dan tambahkan ke keranjang untuk melakukan pemesanan
          atau pre-order.
        </p>
        <div className="pt-4">
          <Link
            href="/books"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-container transition-colors"
          >
            <span>Mulai Jelajahi Buku</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#c1c8c6]/40 pb-4 flex items-baseline justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#779691] block mb-1">
            Pesanan Anda
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1a1c1b]">Keranjang Belanja</h1>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-medium text-[#ba1a1a] hover:underline"
        >
          Kosongkan Keranjang
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Items List */}
        <div className="lg:col-span-8 divide-y divide-[#c1c8c6]/30">
          {items.map((item) => (
            <div key={item.bookId} className="py-5 flex gap-4 sm:gap-6 items-start">
              {/* Thumbnail */}
              <Link
                href={`/books/${item.slug}`}
                className="relative w-20 h-28 sm:w-24 sm:h-32 rounded bg-[#f4f3f1] overflow-hidden flex-shrink-0 border border-[#c1c8c6]/30"
              >
                <Image
                  src={item.coverUrl || defaultCover}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                {item.isPreOrder && (
                  <span className="inline-block bg-[#fed65b] text-[#745c00] text-[10px] font-bold px-1.5 py-0.5 rounded mb-1">
                    PRE-ORDER
                  </span>
                )}
                <Link href={`/books/${item.slug}`}>
                  <h3 className="font-serif font-bold text-base text-[#1a1c1b] hover:text-primary line-clamp-1">
                    {item.title}
                  </h3>
                </Link>
                <p className="text-xs text-[#414847]">{item.author}</p>
                <p className="text-sm font-semibold text-primary pt-1">
                  Rp {Number(item.price).toLocaleString('id-ID')}
                </p>

                {/* Quantity Controls & Remove */}
                <div className="flex items-center gap-4 pt-3">
                  <div className="flex items-center border border-[#c1c8c6] rounded bg-white">
                    <button
                      onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-[#414847] hover:bg-[#f4f3f1]"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-[#414847] hover:bg-[#f4f3f1]"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.bookId)}
                    className="text-xs text-[#717977] hover:text-[#ba1a1a] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    <span>Hapus</span>
                  </button>
                </div>
              </div>

              {/* Subtotal per item */}
              <div className="text-right hidden sm:block">
                <span className="text-xs text-[#717977] block">Subtotal</span>
                <span className="font-semibold text-sm text-[#1a1c1b]">
                  Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4 shadow-sm sticky top-28">
            <h2 className="font-serif text-lg font-bold text-[#1a1c1b]">Ringkasan Belanja</h2>

            <div className="space-y-2 text-xs text-[#414847] border-b border-[#c1c8c6]/30 pb-4">
              <div className="flex justify-between">
                <span>Total Item</span>
                <span className="font-semibold">{totalItems()} buku</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal Buku</span>
                <span className="font-semibold">
                  Rp {totalAmount().toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-[#779691]">
                <span>Biaya Pengiriman</span>
                <span>Dihitung di WhatsApp</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sm font-bold text-[#1a1c1b]">Perkiraan Total</span>
              <span className="font-serif text-xl font-bold text-primary">
                Rp {totalAmount().toLocaleString('id-ID')}
              </span>
            </div>

            <p className="text-[11px] text-[#717977] leading-relaxed">
              *Setelah mengonfirmasi di halaman berikutnya, rincian pesanan akan diteruskan langsung
              ke WhatsApp concierge kami.
            </p>

            <button
              onClick={() => router.push('/checkout')}
              className="w-full py-3 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Lanjut ke Formulir Checkout</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
