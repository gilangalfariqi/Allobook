import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

async function getOrderDetail(orderId: string) {
  try {
    const order = await apiClient<any>(`/orders/${orderId}`);
    return order;
  } catch {
    return null;
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrderDetail(id);

  if (!order) {
    notFound();
  }

  const stages = [
    { key: 'PENDING', label: 'Menunggu Konfirmasi' },
    { key: 'PROCESSING', label: 'PO Diproses' },
    { key: 'CONFIRMED', label: 'Dikonfirmasi' },
    { key: 'SHIPPED', label: 'Dikirim' },
    { key: 'DONE', label: 'Selesai' },
  ];

  const currentStageIndex = stages.findIndex((s) => s.key === order.status);

  // Address helper
  let shippingText = '';
  if (order.shippingAddress) {
    const addr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
    shippingText = [addr.address, addr.city, addr.state, addr.postcode].filter(Boolean).join(', ');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/orders"
          className="text-xs font-semibold text-[#779691] hover:underline inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>Kembali ke Riwayat Pesanan</span>
        </Link>
        <h1 className="font-serif text-3xl font-bold text-[#1a1c1b]">Detail Pesanan</h1>
        <p className="text-xs font-mono text-[#717977]">ID: #{order.id}</p>
      </div>

      {/* Status Progress */}
      <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#c1c8c6]/20 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#779691]">
            Status Pemesanan
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded ${
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

        {order.status !== 'CANCELLED' && (
          <div className="relative flex items-center justify-between pt-4 pb-2">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#efeeec] -translate-y-1/2 -z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-0 transition-all duration-500"
              style={{
                width: `${Math.max(0, (currentStageIndex / (stages.length - 1)) * 100)}%`,
              }}
            />

            {stages.map((stage, idx) => {
              const isPastOrCurrent = currentStageIndex >= idx;
              return (
                <div key={stage.key} className="flex flex-col items-center gap-1.5 z-10">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
                      isPastOrCurrent
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-[#c1c8c6] text-[#717977]'
                    }`}
                  >
                    {isPastOrCurrent ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] font-medium hidden sm:inline ${
                      isPastOrCurrent ? 'text-primary font-semibold' : 'text-[#717977]'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer & Shipping Details */}
      <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4 shadow-sm text-xs">
        <h2 className="text-xs uppercase font-bold tracking-wider text-[#779691] border-b border-[#c1c8c6]/20 pb-2">
          Informasi Pemesan & Pengiriman
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[#717977] block">Nama Pelanggan</span>
            <span className="font-semibold text-[#1a1c1b]">{order.customerName}</span>
          </div>
          <div>
            <span className="text-[#717977] block">Nomor WhatsApp</span>
            <span className="font-mono text-[#1a1c1b]">{order.customerPhone}</span>
          </div>
          {order.customerEmail && (
            <div className="col-span-2">
              <span className="text-[#717977] block">Email Notifikasi</span>
              <span className="text-[#1a1c1b]">{order.customerEmail}</span>
            </div>
          )}
          {shippingText && (
            <div className="col-span-2">
              <span className="text-[#717977] block">Alamat Pengiriman</span>
              <span className="text-[#1a1c1b]">{shippingText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4 shadow-sm">
        <h2 className="text-xs uppercase font-bold tracking-wider text-[#779691] border-b border-[#c1c8c6]/20 pb-2">
          Daftar Buku
        </h2>
        <div className="divide-y divide-[#c1c8c6]/20">
          {order.items?.map((item: any) => (
            <div key={item.id} className="py-3 flex justify-between items-center text-xs">
              <div>
                <Link
                  href={`/books/${item.book?.slug || ''}`}
                  className="font-semibold text-[#1a1c1b] hover:text-primary transition-colors"
                >
                  {item.book?.title || 'Judul Buku'}
                </Link>
                <div className="text-[#717977] text-[11px] mt-0.5">
                  Rp {Number(item.priceAtOrder).toLocaleString('id-ID')} × {item.quantity}
                </div>
              </div>
              <span className="font-semibold text-[#1a1c1b]">
                Rp {(Number(item.priceAtOrder) * item.quantity).toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-[#c1c8c6]/40 pt-4 flex justify-between items-center">
          <span className="text-xs font-semibold text-[#1a1c1b]">Total Pembayaran</span>
          <span className="font-serif text-lg font-bold text-primary">
            Rp {Number(order.totalAmount).toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  );
}
