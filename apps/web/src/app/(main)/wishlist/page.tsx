'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function WishlistPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    apiClient<any[]>('/wishlist')
      .then((data) => setItems(data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user, router]);

  const handleRemove = async (bookId: string) => {
    try {
      await apiClient(`/wishlist/${bookId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.bookId !== bookId));
    } catch {
      // Ignore
    }
  };

  const handleAddToCart = (book: any) => {
    addItem({
      bookId: book.id,
      slug: book.slug,
      title: book.title,
      author: book.author,
      price: Number(book.price),
      coverUrl: book.coverUrl,
      isPreOrder: book.isPreOrder,
    });
  };

  if (!user) return null;

  const defaultCover =
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400';

  return (
    <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#779691] block mb-1">
          Koleksi Tersimpan
        </span>
        <h1 className="font-serif text-3xl font-bold text-[#1a1c1b]">Wishlist Saya</h1>
        <p className="text-xs text-[#414847] mt-1">Buku-buku impian yang ingin Anda miliki.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#717977]">Memuat wishlist...</div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => {
            const book = item.book;
            return (
              <div
                key={item.id}
                className="group relative flex flex-col bg-white border border-[#c1c8c6]/40 rounded-md overflow-hidden hover:shadow-md transition-all"
              >
                <Link
                  href={`/books/${book.slug}`}
                  className="relative aspect-[3/4] w-full bg-[#f4f3f1] overflow-hidden block"
                >
                  <Image
                    src={book.coverUrl || defaultCover}
                    alt={book.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {book.isPreOrder && (
                    <span className="absolute top-2 left-2 bg-[#fed65b] text-[#745c00] text-[10px] font-bold px-1.5 py-0.5 rounded">
                      PRE-ORDER
                    </span>
                  )}
                </Link>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <Link href={`/books/${book.slug}`}>
                      <h3 className="font-serif text-sm font-bold text-[#1a1c1b] line-clamp-2 hover:text-primary">
                        {book.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-[#414847] mt-0.5">{book.author}</p>
                    <p className="text-xs font-semibold text-primary pt-1">
                      Rp {Number(book.price).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#c1c8c6]/20 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleAddToCart(book)}
                      className="flex-1 py-1.5 px-2 bg-primary text-white text-[11px] font-semibold rounded hover:bg-primary-container transition-colors"
                    >
                      + Keranjang
                    </button>
                    <button
                      onClick={() => handleRemove(book.id)}
                      className="p-1.5 text-[#717977] hover:text-[#ba1a1a] rounded"
                      title="Hapus dari wishlist"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-[#c1c8c6]/40 rounded-lg space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#717977]">favorite</span>
          <p className="text-sm font-semibold text-[#1a1c1b]">Wishlist Anda Kosong</p>
          <p className="text-xs text-[#414847]">
            Simpan buku yang Anda sukai agar mudah ditemukan nanti.
          </p>
          <div className="pt-2">
            <Link
              href="/books"
              className="inline-block text-xs font-semibold px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-container"
            >
              Jelajahi Buku Sekarang
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
