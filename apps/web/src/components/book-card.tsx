'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/stores/cart.store';
import { useState } from 'react';

interface BookCardProps {
  book: {
    id: string;
    slug: string;
    title: string;
    author: string;
    price: number;
    coverUrl?: string | null;
    isPreOrder: boolean;
    averageRating?: number;
    reviewCount?: number;
    categories?: Array<{ name: string; slug: string }>;
  };
}

export function BookCard({ book }: BookCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      bookId: book.id,
      slug: book.slug,
      title: book.title,
      author: book.author,
      price: Number(book.price),
      coverUrl: book.coverUrl,
      isPreOrder: book.isPreOrder,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const defaultCover =
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600';

  return (
    <div className="group relative flex flex-col bg-white border border-[#c1c8c6]/40 rounded-md overflow-hidden hover:shadow-md transition-all duration-300">
      {/* Cover Image Container */}
      <Link href={`/books/${book.slug}`} className="relative aspect-[3/4] w-full bg-[#f4f3f1] overflow-hidden block">
        <Image
          src={book.coverUrl || defaultCover}
          alt={book.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Pre-Order Badge */}
        {book.isPreOrder && (
          <span className="absolute top-2 left-2 bg-[#fed65b] text-[#745c00] text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
            PRE-ORDER
          </span>
        )}

        {/* Quick action overlay */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-2 right-2 bg-[#001915]/90 hover:bg-[#001915] text-white p-2 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title={book.isPreOrder ? 'Pre-order Sekarang' : 'Tambah ke Keranjang'}
        >
          <span className="material-symbols-outlined text-xl">
            {added ? 'check' : 'add_shopping_cart'}
          </span>
        </button>
      </Link>

      {/* Book Metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category Chip */}
          {book.categories && book.categories.length > 0 && (
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#779691] block mb-1">
              {book.categories[0].name}
            </span>
          )}

          {/* Title */}
          <Link href={`/books/${book.slug}`}>
            <h3 className="font-serif text-base font-bold text-[#1a1c1b] group-hover:text-[#0f2e2a] transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
          </Link>

          {/* Author */}
          <p className="text-xs text-[#414847] mt-1 line-clamp-1">{book.author}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#c1c8c6]/20 flex items-center justify-between">
          {/* Rating */}
          <div className="flex items-center gap-1 text-xs text-[#735c00]">
            <span className="material-symbols-outlined text-sm text-[#fed65b]">star</span>
            <span className="font-semibold">{book.averageRating || 5.0}</span>
            {book.reviewCount !== undefined && book.reviewCount > 0 && (
              <span className="text-[#414847]/70 text-[11px]">({book.reviewCount})</span>
            )}
          </div>

          {/* Price */}
          <span className="font-semibold text-sm text-[#001915]">
            Rp {Number(book.price).toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  );
}
