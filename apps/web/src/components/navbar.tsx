'use client';

import Link from 'next/link';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const totalItems = useCartStore((s) => s.totalItems());
  const { user, logout, isAdmin } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient<any[]>(`/search/suggest?q=${encodeURIComponent(searchQuery)}`);
        setSuggestions(res || []);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      router.push(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#faf9f7]/95 backdrop-blur-md border-b border-[#c1c8c6]/30">
      <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="material-symbols-outlined text-primary text-3xl">auto_stories</span>
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-primary">
            AlloBook
          </span>
        </Link>

        {/* Search Bar with Auto-suggest */}
        <div ref={searchRef} className="hidden md:flex flex-1 max-w-md relative">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
              placeholder="Cari judul buku, penulis, atau genre..."
              className="w-full bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-[#414847]/60"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#414847] text-xl">
              search
            </span>
            {isSearching && (
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#414847] text-xl animate-spin">
                progress_activity
              </span>
            )}
          </form>

          {/* Dropdown Suggestions */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#c1c8c6]/50 rounded-md shadow-lg overflow-hidden z-50">
              <div className="p-2 text-xs font-semibold text-[#414847] uppercase tracking-wider border-b border-[#c1c8c6]/20">
                Saran Pencarian
              </div>
              <div className="divide-y divide-[#c1c8c6]/10">
                {suggestions.map((item) => (
                  <Link
                    key={item.id}
                    href={`/books/${item.slug}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 p-3 hover:bg-[#f4f3f1] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[#779691]">book</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1c1b] truncate">{item.title}</p>
                      <p className="text-xs text-[#414847] truncate">{item.author}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      Rp {Number(item.price).toLocaleString('id-ID')}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links & Actions */}
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/books"
            className="hidden sm:inline-block text-sm font-medium text-[#1a1c1b] hover:text-primary transition-colors"
          >
            Katalog
          </Link>

          {/* Wishlist Link */}
          <Link
            href="/wishlist"
            className="hidden sm:flex items-center justify-center p-2 rounded-md hover:bg-[#f4f3f1] transition-colors text-[#1a1c1b]"
            title="Wishlist"
          >
            <span className="material-symbols-outlined text-2xl">favorite</span>
          </Link>

          {/* Cart Icon */}
          <Link
            href="/cart"
            className="relative p-2 rounded-md hover:bg-[#f4f3f1] transition-colors text-[#1a1c1b]"
            title="Keranjang"
          >
            <span className="material-symbols-outlined text-2xl">shopping_bag</span>
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 bg-[#fed65b] text-[#745c00] text-[11px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>

          {/* User Auth Menu */}
          {user ? (
            <div className="flex items-center gap-2.5">
              {isAdmin() && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1b3b2b] text-white hover:bg-[#142e21] shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-sm text-emerald-300">dashboard</span>
                  <span>Dashboard Admin</span>
                </Link>
              )}
              <Link
                href="/orders"
                className="hidden sm:inline-block text-xs font-medium text-[#1a1c1b] hover:text-primary px-2 py-1.5"
              >
                Pesanan Saya
              </Link>
              <button
                onClick={logout}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-[#c1c8c6] text-[#414847] hover:bg-[#f4f3f1] transition-colors"
              >
                Keluar
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-white text-xs sm:text-sm font-medium hover:bg-primary-container transition-colors shadow-sm"
            >
              Masuk
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
