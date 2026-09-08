import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { BottomNav } from '@/components/bottom-nav';
import { ChatbotWidget } from '@/components/chatbot-widget';

export const metadata: Metadata = {
  title: {
    default: 'AlloBook — Kurasi Buku & Pre-Order Concierge',
    template: '%s | AlloBook',
  },
  description:
    'Temukan literatur terbaik dan lakukan pre-order buku langka maupun terbitan terbaru dengan layanan personal WhatsApp Concierge di AlloBook.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'AlloBook — Kurasi Buku & Pre-Order Concierge',
    description:
      'Temukan literatur terbaik dan lakukan pre-order buku dengan layanan personal WhatsApp Concierge.',
    siteName: 'AlloBook',
    locale: 'id_ID',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body className="flex flex-col min-h-full pb-16 sm:pb-0">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomNav />
          <ChatbotWidget />
        </Providers>
      </body>
    </html>
  );
}
