'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyOrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    apiClient<any[]>('/orders')
      .then((data) => setOrders(data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#779691] block mb-1">
          Akun Saya
        </span>
        <h1 className="font-serif text-3xl font-bold text-[#1a1c1b]">Riwayat Pesanan</h1>
        <p className="text-xs text-[#414847] mt-1">
          Lacak status pemrosesan pre-order dan pengiriman buku Anda.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#717977]">Memuat daftar pesanan...</div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 bg-white border border-[#c1c8c6]/40 rounded-lg space-y-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c1c8c6]/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#1a1c1b]">
                    #{order.id}
                  </span>
                  <span className="text-[11px] text-[#717977]">
                    • {new Date(order.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${
                    order.status === 'DONE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-[#fed65b]/40 text-[#745c00]'
                  }`}
                >
                  {order.statusLabel || order.status}
                </span>
              </div>

              {/* Items in order */}
              <div className="space-y-2 text-xs divide-y divide-[#c1c8c6]/10">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="pt-2 first:pt-0 flex justify-between">
                    <div>
                      <span className="font-semibold text-[#1a1c1b]">
                        {item.book?.title || 'Buku'}
                      </span>
                      <span className="text-[#717977] ml-2">x{item.quantity}</span>
                    </div>
                    <span>Rp {(Number(item.priceAtOrder) * item.quantity).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#c1c8c6]/20 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-[#717977]">Total: </span>
                  <span className="font-serif font-bold text-sm text-primary">
                    Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                  </span>
                </div>

                <Link
                  href={`/order-confirmation?orderId=${order.id}`}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Lacak Status</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-[#c1c8c6]/40 rounded-lg space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#717977]">receipt_long</span>
          <p className="text-sm font-semibold text-[#1a1c1b]">Belum Ada Pesanan</p>
          <p className="text-xs text-[#414847]">
            Anda belum pernah membuat pesanan atau pre-order buku.
          </p>
          <div className="pt-2">
            <Link
              href="/books"
              className="inline-block text-xs font-semibold px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-container"
            >
              Mulai Belanja
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
