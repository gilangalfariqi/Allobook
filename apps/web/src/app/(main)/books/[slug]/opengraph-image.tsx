import { ImageResponse } from 'next/og';
import { apiClient } from '@/lib/api-client';

export const runtime = 'nodejs';
export const alt = 'AlloBook Book Preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let book: any = null;
  try {
    book = await apiClient<any>(`/books/${slug}`);
  } catch {
    // Fallback if API is offline
  }

  const title = book?.title || 'Koleksi Buku Terpilih';
  const author = book?.author ? `oleh ${book.author}` : 'AlloBook Curated Library';
  const price = book?.price
    ? `Rp ${Number(book.price).toLocaleString('id-ID')}`
    : 'Pre-Order & Ready Stock';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 80px',
          backgroundColor: '#001915',
          color: '#faf9f7',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: '#adcdc7',
              fontWeight: 600,
            }}
          >
            AlloBook
          </div>
          <div
            style={{
              fontSize: 16,
              padding: '6px 16px',
              borderRadius: '9999px',
              backgroundColor: '#3e2219',
              color: '#fed65b',
              fontWeight: 600,
            }}
          >
            Curated Literature
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 'bold',
              color: '#ffffff',
              lineHeight: 1.2,
              maxHeight: '180px',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 26, color: '#fed65b', fontStyle: 'italic' }}>
            {author}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(193, 200, 198, 0.2)',
            paddingTop: '24px',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#c8e9e3' }}>
            {price}
          </div>
          <div style={{ fontSize: 18, color: '#c1c8c6' }}>
            Pre-Order via WhatsApp Concierge
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
