'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/stores/cart.store';

export function BottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());

  const navItems = [
    { label: 'Home', href: '/', icon: 'home' },
    { label: 'Katalog', href: '/books', icon: 'auto_stories' },
    { label: 'Wishlist', href: '/wishlist', icon: 'favorite' },
    { label: 'Keranjang', href: '/cart', icon: 'shopping_bag', badge: totalItems },
    { label: 'Akun', href: '/orders', icon: 'person' },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#faf9f7]/95 backdrop-blur-md border-t border-[#c1c8c6]/40 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-md transition-colors relative ${
              isActive ? 'text-primary font-bold' : 'text-[#414847] hover:text-primary'
            }`}
          >
            <div className="relative">
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-2 bg-[#fed65b] text-[#745c00] text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
