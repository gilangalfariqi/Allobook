'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ORDER_STATUS_LABELS, OrderStatus } from '@allobook/shared-types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    apiClient<{ items: any[] }>('/orders/admin?limit=50')
      .then((data) => setOrders(data.items || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await apiClient(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch {
      alert('Gagal memperbarui status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1a1c1b]">Kelola Pesanan &amp; Pre-Order</h1>
          <p className="text-xs text-[#414847] mt-0.5">
            Perbarui status pesanan dari WhatsApp concierge secara langsung.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="text-xs font-semibold px-3 py-1.5 bg-[#efeeec] hover:bg-[#e3e2e0] rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#717977]">Memuat daftar pesanan...</div>
      ) : orders.length > 0 ? (
        <div className="bg-white border border-[#c1c8c6]/40 rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f4f3f1] border-b border-[#c1c8c6]/40 text-[#414847]">
                <th className="p-3 font-semibold">ID / Tanggal</th>
                <th className="p-3 font-semibold">Pemesan</th>
                <th className="p-3 font-semibold">Item Buku</th>
                <th className="p-3 font-semibold">Total</th>
                <th className="p-3 font-semibold">Status Pesanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c1c8c6]/20">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#faf9f7] transition-colors">
                  <td className="p-3 align-top font-mono text-[11px]">
                    <span className="font-bold text-primary block">#{order.id.slice(-8)}</span>
                    <span className="text-[#717977]">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </td>

                  <td className="p-3 align-top">
                    <p className="font-semibold text-[#1a1c1b]">{order.customerName}</p>
                    <a
                      href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-medium hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <span className="material-symbols-outlined text-xs">chat</span>
                      <span>{order.customerPhone}</span>
                    </a>
                  </td>

                  <td className="p-3 align-top max-w-xs">
                    <div className="space-y-1">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="text-[11px] text-[#414847]">
                          • {item.book?.title || 'Buku'} (x{item.quantity})
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="p-3 align-top font-semibold text-primary">
                    Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                  </td>

                  <td className="p-3 align-top">
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="text-xs p-1.5 rounded border border-[#c1c8c6] bg-white focus:outline-none focus:border-primary font-medium"
                    >
                      {Object.entries(ORDER_STATUS_LABELS).map(([statusKey, label]) => (
                        <option key={statusKey} value={statusKey}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-20 text-center bg-white border border-[#c1c8c6]/40 rounded-lg text-xs text-[#717977]">
          Belum ada pesanan masuk.
        </div>
      )}
    </div>
  );
}
