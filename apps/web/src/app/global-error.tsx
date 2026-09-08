'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="id">
      <body className="flex flex-col items-center justify-center min-h-screen p-4 text-center font-sans">
        <h2 className="text-xl font-bold mb-2 text-[#1a1c1b]">Terjadi Kesalahan Sistem</h2>
        <p className="text-xs text-[#717977] mb-4">
          Tim teknis kami telah menerima laporan error ini secara otomatis.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-[#001915] text-[#c8e9e3] rounded text-xs font-semibold hover:bg-[#002b24] transition-colors"
        >
          Muat Ulang Halaman
        </button>
      </body>
    </html>
  );
}
