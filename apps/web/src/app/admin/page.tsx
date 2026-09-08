'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient('/admin/stats')
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#1a1c1b]">Ringkasan Statistik</h1>
        <p className="text-xs text-[#414847] mt-0.5">
          Performa katalog buku dan aktivitas pesanan pelanggan.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#717977]">Memuat statistik...</div>
      ) : (
        <>
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-[#c1c8c6]/40 rounded-lg space-y-1 shadow-sm">
              <span className="text-xs text-[#717977] font-medium">Total Judul Buku</span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                {stats?.totalBooks ?? 0}
              </p>
            </div>

            <div className="p-5 bg-white border border-[#c1c8c6]/40 rounded-lg space-y-1 shadow-sm">
              <span className="text-xs text-[#717977] font-medium">Total Pesanan</span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                {stats?.totalOrders ?? 0}
              </p>
            </div>

            <div className="p-5 bg-white border border-[#c1c8c6]/40 rounded-lg space-y-1 shadow-sm">
              <span className="text-xs text-[#717977] font-medium">Pelanggan Terdaftar</span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                {stats?.totalUsers ?? 0}
              </p>
            </div>

            <div className="p-5 bg-white border border-[#c1c8c6]/40 rounded-lg space-y-1 shadow-sm">
              <span className="text-xs text-[#717977] font-medium">Total Estimasi Omset</span>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#735c00]">
                Rp {Number(stats?.totalRevenue ?? 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Orders by Status breakdown */}
          <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4 shadow-sm">
            <h2 className="font-serif text-base font-bold text-[#1a1c1b]">
              Status Pesanan Masuk
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { key: 'PENDING', label: 'Menunggu Konfirmasi', color: 'bg-amber-50 text-amber-800' },
                { key: 'PROCESSING', label: 'PO Diproses', color: 'bg-blue-50 text-blue-800' },
                { key: 'CONFIRMED', label: 'Terkonfirmasi', color: 'bg-indigo-50 text-indigo-800' },
                { key: 'SHIPPED', label: 'Sedang Dikirim', color: 'bg-purple-50 text-purple-800' },
                { key: 'DONE', label: 'Selesai', color: 'bg-emerald-50 text-emerald-800' },
              ].map((st) => (
                <div key={st.key} className={`p-3 rounded-md ${st.color} space-y-1`}>
                  <span className="text-[11px] font-semibold block">{st.label}</span>
                  <p className="text-lg font-bold">
                    {stats?.ordersByStatus?.[st.key] ?? 0} pesanan
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
