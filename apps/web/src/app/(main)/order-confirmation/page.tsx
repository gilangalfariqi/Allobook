import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{ orderId?: string }>;
}

async function getOrder(orderId?: string) {
  if (!orderId) return null;
  try {
    const order = await apiClient<any>(`/orders/${orderId}`);
    return order;
  } catch {
    return null;
  }
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { orderId } = await searchParams;
  const order = await getOrder(orderId);

  const stages = [
    { key: 'PENDING', label: 'Menunggu Konfirmasi' },
    { key: 'PROCESSING', label: 'Diproses' },
    { key: 'CONFIRMED', label: 'Dikonfirmasi' },
    { key: 'SHIPPED', label: 'Dikirim' },
    { key: 'DONE', label: 'Selesai' },
  ];

  const currentStageIndex = stages.findIndex((s) => s.key === (order?.status || 'PENDING'));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Top Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-3xl">task_alt</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#1a1c1b]">Pesanan Telah Dibuat!</h1>
        <p className="text-xs text-[#414847] max-w-md mx-auto">
          Terima kasih telah memesan di AlloBook. Tim concierge kami siap melayani Anda melalui
          WhatsApp untuk konfirmasi final dan petunjuk pembayaran.
        </p>
        {order?.id && (
          <p className="text-xs font-mono bg-[#efeeec] inline-block px-3 py-1 rounded text-[#1a1c1b]">
            Order ID: {order.id}
          </p>
        )}
      </div>

      {/* 5-Stage Status Tracker */}
      <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4">
        <h2 className="text-xs uppercase font-bold tracking-wider text-[#779691]">
          Status Pelacakan Pesanan
        </h2>
        <div className="relative flex items-center justify-between pt-2">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#efeeec] -translate-y-1/2 -z-0" />
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-0 transition-all duration-500"
            style={{
              width: `${(Math.max(0, currentStageIndex) / (stages.length - 1)) * 100}%`,
            }}
          />

          {stages.map((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-1 z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : 'bg-white border-2 border-[#c1c8c6] text-[#717977]'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-[#414847] text-center max-w-[60px] leading-tight">
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Summary Breakdown */}
      {order && (
        <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4 text-xs">
          <h2 className="font-serif text-sm font-bold text-[#1a1c1b] border-b border-[#c1c8c6]/20 pb-2">
            Rincian Pesanan
          </h2>

          <div className="space-y-2 divide-y divide-[#c1c8c6]/20">
            {order.items?.map((item: any) => (
              <div key={item.id} className="pt-2 first:pt-0 flex justify-between">
                <div>
                  <p className="font-semibold text-[#1a1c1b]">{item.book?.title || 'Buku'}</p>
                  <p className="text-[#717977]">
                    {item.quantity} eks x Rp {Number(item.priceAtOrder).toLocaleString('id-ID')}
                  </p>
                </div>
                <span className="font-semibold">
                  Rp {(Number(item.priceAtOrder) * item.quantity).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#c1c8c6]/40 flex justify-between items-baseline text-sm font-bold">
            <span>Total Tagihan</span>
            <span className="text-primary font-serif text-base">
              Rp {Number(order.totalAmount).toLocaleString('id-ID')}
            </span>
          </div>

          {/* Shipping destination */}
          <div className="pt-3 border-t border-[#c1c8c6]/20 text-[#414847]">
            <span className="block font-semibold text-[#1a1c1b] mb-0.5">Tujuan Pengiriman:</span>
            <p>{order.customerName} ({order.customerPhone})</p>
            <p>
              {order.shippingAddress?.address}, {order.shippingAddress?.city},{' '}
              {order.shippingAddress?.state} {order.shippingAddress?.postcode}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-2">
        {order?.whatsappUrl && (
          <a
            href={order.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-md bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-lg">chat</span>
            <span>Buka Chat WhatsApp Concierge</span>
          </a>
        )}

        <Link
          href="/books"
          className="w-full py-3 rounded-md border border-[#c1c8c6] hover:bg-[#f4f3f1] text-[#1a1c1b] text-xs font-semibold flex items-center justify-center transition-colors"
        >
          Kembali ke Katalog Buku
        </Link>
      </div>
    </div>
  );
}
