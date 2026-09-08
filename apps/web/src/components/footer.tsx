import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#001915] text-[#faf9f7] border-t border-[#0f2e2a] mt-24">
      <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#779691] text-3xl">auto_stories</span>
              <span className="font-serif text-3xl font-bold tracking-tight text-white">
                AlloBook
              </span>
            </div>
            <p className="text-sm text-[#c1c8c6] max-w-md leading-relaxed font-sans">
              Platform kurasi buku pilihan dengan fokus pada penemuan karya literatur terbaik dan
              layanan Pre-Order concierge terpercaya melalui WhatsApp.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#779691]">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>100% Original &amp; Pengiriman Terpercaya</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#fed65b]">
              Jelajahi
            </h4>
            <ul className="space-y-2 text-sm text-[#c1c8c6]">
              <li>
                <Link href="/books" className="hover:text-white transition-colors">
                  Katalog Lengkap
                </Link>
              </li>
              <li>
                <Link href="/books?isPreOrder=true" className="hover:text-white transition-colors">
                  Buku Pre-Order
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="hover:text-white transition-colors">
                  Wishlist Saya
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white transition-colors">
                  Keranjang Belanja
                </Link>
              </li>
            </ul>
          </div>

          {/* Concierge & Support */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#fed65b]">
              Layanan Concierge
            </h4>
            <p className="text-xs text-[#c1c8c6] leading-relaxed">
              Pemesanan ditangani langsung oleh konsultan buku kami via WhatsApp.
            </p>
            <div className="pt-2 flex items-center gap-2 text-sm font-medium text-white">
              <span className="material-symbols-outlined text-emerald-400">chat</span>
              <span>WhatsApp Concierge</span>
            </div>
            <p className="text-xs text-[#779691]">Senin – Minggu (08:00 – 21:00 WIB)</p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#0f2e2a] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#779691]">
          <p>© {new Date().getFullYear()} AlloBook. Hak Cipta Dilindungi.</p>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer">Syarat &amp; Ketentuan</span>
            <span className="hover:text-white cursor-pointer">Kebijakan Privasi</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
