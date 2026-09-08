'use client';

import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (items.length === 0) {
    return (
      <div className="max-w-container-max mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold">Keranjang Anda Kosong</h1>
        <p className="text-xs text-[#414847]">Silakan pilih buku sebelum melanjutkan ke checkout.</p>
        <Link
          href="/books"
          className="inline-block px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-md"
        >
          Lihat Katalog Buku
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!customerName || !customerPhone || !address || !city || !state || !postcode) {
      setErrorMsg('Harap lengkapi semua kolom bertanda bintang (*)');
      setLoading(false);
      return;
    }

    try {
      const orderPayload = {
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        shippingAddress: {
          address,
          city,
          state,
          postcode,
          notes: notes || undefined,
        },
        items: items.map((i) => ({
          bookId: i.bookId,
          quantity: i.quantity,
        })),
      };

      const res = await apiClient<{ order: any; whatsappUrl: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      // Clear the local cart
      clearCart();

      // Open WhatsApp in a new tab if supported
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }

      // Navigate to order confirmation page
      router.push(`/order-confirmation?orderId=${res.order.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses pesanan');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#779691] block mb-1">
          Langkah Terakhir
        </span>
        <h1 className="font-serif text-3xl font-bold text-[#1a1c1b]">
          Formulir Informasi Pengiriman
        </h1>
        <p className="text-xs text-[#414847] mt-1">
          Pesanan akan diteruskan langsung ke WhatsApp Concierge AlloBook.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Form Fields Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customer Info Card */}
          <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4">
            <h2 className="font-serif text-base font-bold text-[#1a1c1b] border-b border-[#c1c8c6]/20 pb-2">
              1. Informasi Pemesan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#414847] mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Raden Saleh"
                  className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414847] mb-1">
                  Nomor WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#414847] mb-1">
                  Email (Opsional untuk e-invoice)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4">
            <h2 className="font-serif text-base font-bold text-[#1a1c1b] border-b border-[#c1c8c6]/20 pb-2">
              2. Alamat Pengiriman
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#414847] mb-1">
                  Alamat Lengkap *
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan..."
                  className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#414847] mb-1">Kota / Kab *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jakarta Selatan"
                    className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#414847] mb-1">Provinsi *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="DKI Jakarta"
                    className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#414847] mb-1">Kode Pos *</label>
                  <input
                    type="text"
                    required
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="12345"
                    className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#414847] mb-1">
                  Catatan untuk Kurir (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Titipkan di pos satpam jika tidak ada orang"
                  className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Summary & CTA */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-5 shadow-sm sticky top-28">
            <h2 className="font-serif text-lg font-bold text-[#1a1c1b]">Daftar Pesanan</h2>

            <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-[#c1c8c6]/20 pr-1">
              {items.map((item) => (
                <div key={item.bookId} className="pt-2 first:pt-0 flex justify-between text-xs">
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-[#1a1c1b] line-clamp-1">{item.title}</p>
                    <p className="text-[#717977]">
                      {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className="font-semibold text-[#1a1c1b]">
                    Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#c1c8c6]/30 flex justify-between items-baseline">
              <span className="text-sm font-bold text-[#1a1c1b]">Total Pesanan</span>
              <span className="font-serif text-xl font-bold text-primary">
                Rp {totalAmount().toLocaleString('id-ID')}
              </span>
            </div>

            {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-md bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              <span>{loading ? 'Menyiapkan...' : 'Lanjut ke WhatsApp Concierge'}</span>
            </button>

            <div className="text-[11px] text-[#717977] space-y-1 leading-relaxed bg-[#f4f3f1] p-3 rounded">
              <div className="flex items-center gap-1 font-semibold text-[#1a1c1b]">
                <span className="material-symbols-outlined text-sm text-[#779691]">shield</span>
                <span>Proses Pembelian Aman:</span>
              </div>
              <p>
                1. Tombol akan membuka WhatsApp dengan ringkasan pesanan Anda yang telah terformat.
              </p>
              <p>2. Tim concierge kami mengonfirmasi ketersediaan dan opsi kurir pengiriman.</p>
              <p>3. Pembayaran via transfer bank resmi setelah konfirmasi.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
