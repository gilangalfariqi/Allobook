'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (mounted && (!user || !isAdmin())) {
      router.push('/login');
    }
  }, [user, isAdmin, router, mounted]);

  if (!mounted || !user || !isAdmin()) {
    return (
      <div className="py-24 text-center text-xs text-[#717977]">
        Memeriksa hak akses administrator...
      </div>
    );
  }

  const links = [
    { label: 'Ringkasan Dashboard', href: '/admin', icon: 'dashboard' },
    { label: 'Kelola Pesanan & PO', href: '/admin/orders', icon: 'receipt_long' },
    { label: 'Kelola Buku & Stok', href: '/admin/books', icon: 'menu_book' },
    { label: 'Pengaturan WhatsApp', href: '/admin/settings', icon: 'settings' },
  ];

  return (
    <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row items-start gap-8">
        {/* Admin Sidebar */}
        <aside className="w-full md:w-64 bg-white border border-[#c1c8c6]/40 rounded-lg p-4 space-y-2 flex-shrink-0 shadow-sm">
          <div className="p-2 border-b border-[#c1c8c6]/20 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#779691] block">
              Panel Pengelola
            </span>
            <span className="font-serif font-bold text-sm text-[#1a1c1b]">AlloBook Admin</span>
          </div>

          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-[#414847] hover:bg-[#f4f3f1] hover:text-[#1a1c1b]'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* Admin Content Area */}
        <div className="flex-1 w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}
