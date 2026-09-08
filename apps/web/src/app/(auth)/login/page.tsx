'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await apiClient<{ user: any; accessToken: string; refreshToken: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );

      setAuth(res.user, res.accessToken, res.refreshToken);

      if (res.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal. Periksa kembali email dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <span className="material-symbols-outlined text-primary text-3xl">auto_stories</span>
            <span className="font-serif text-2xl font-bold tracking-tight text-primary">
              AlloBook
            </span>
          </Link>
          <h1 className="font-serif text-xl font-bold text-[#1a1c1b]">Masuk ke Akun Anda</h1>
          <p className="text-xs text-[#414847]">
            Nikmati kemudahan pelacakan pre-order dan ulasan buku.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#414847] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414847] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk Sekarang'}
          </button>
        </form>

        <div className="pt-4 border-t border-[#c1c8c6]/20 text-center text-xs text-[#414847]">
          Belum memiliki akun?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
