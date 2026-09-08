'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export function BookDetailActions({ book }: { book: any }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const { user } = useAuthStore();

  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient<{ isWishlisted: boolean }>(`/wishlist/${book.id}/check`)
      .then((res) => setIsWishlisted(res.isWishlisted))
      .catch(() => setIsWishlisted(false));
  }, [user, book.id]);

  const handleAddToCart = () => {
    addItem(
      {
        bookId: book.id,
        slug: book.slug,
        title: book.title,
        author: book.author,
        price: Number(book.price),
        coverUrl: book.coverUrl,
        isPreOrder: book.isPreOrder,
      },
      quantity
    );
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  const toggleWishlist = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setLoadingWishlist(true);
    try {
      if (isWishlisted) {
        await apiClient(`/wishlist/${book.id}`, { method: 'DELETE' });
        setIsWishlisted(false);
      } else {
        await apiClient(`/wishlist/${book.id}`, { method: 'POST' });
        setIsWishlisted(true);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingWishlist(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center gap-4">
        {/* Quantity Selector */}
        <div className="flex items-center border border-[#c1c8c6] rounded-md bg-white">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-[#414847] hover:bg-[#f4f3f1]"
          >
            -
          </button>
          <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="w-10 h-10 flex items-center justify-center text-[#414847] hover:bg-[#f4f3f1]"
          >
            +
          </button>
        </div>

        {/* Add to Cart / Pre-Order Button */}
        <button
          onClick={handleAddToCart}
          className="flex-1 min-w-[200px] h-10 px-6 rounded-md bg-[#001915] hover:bg-[#0f2e2a] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-lg">
            {book.isPreOrder ? 'hourglass_top' : 'shopping_bag'}
          </span>
          <span>
            {addedNotice
              ? 'Tersimpan di Keranjang!'
              : book.isPreOrder
                ? 'Tambah ke Keranjang Pre-Order'
                : 'Tambah ke Keranjang'}
          </span>
        </button>

        {/* Buy / Checkout Direct CTA */}
        <button
          onClick={handleBuyNow}
          className="h-10 px-6 rounded-md bg-[#fed65b] hover:bg-[#ffe088] text-[#745c00] text-sm font-bold shadow-sm transition-colors"
        >
          Lanjut ke Pesanan
        </button>

        {/* Wishlist Button */}
        <button
          onClick={toggleWishlist}
          disabled={loadingWishlist}
          className={`w-10 h-10 rounded-md border flex items-center justify-center transition-colors ${
            isWishlisted
              ? 'border-rose-300 bg-rose-50 text-rose-600'
              : 'border-[#c1c8c6] hover:bg-[#f4f3f1] text-[#414847]'
          }`}
          title="Wishlist"
        >
          <span className="material-symbols-outlined text-xl">
            {isWishlisted ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      </div>

      {addedNotice && (
        <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 animate-pulse">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {quantity} buku berhasil ditambahkan ke keranjang belanja.
        </p>
      )}
    </div>
  );
}
