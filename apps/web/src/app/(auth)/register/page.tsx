'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient<{ user: any; accessToken: string; refreshToken: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        }
      );

      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Pendaftaran gagal. Coba gunakan email lain.');
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
          <h1 className="font-serif text-xl font-bold text-[#1a1c1b]">Buat Akun Baru</h1>
          <p className="text-xs text-[#414847]">
            Daftarkan diri Anda untuk pengalaman belanja dan pre-order yang lebih personal.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#414847] mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Chairil Anwar"
              className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

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
              placeholder="Minimal 6 karakter"
              className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="pt-4 border-t border-[#c1c8c6]/20 text-center text-xs text-[#414847]">
          Sudah memiliki akun?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
