'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function AdminSettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [storeName, setStoreName] = useState('AlloBook Indonesia');
  const [supportEmail, setSupportEmail] = useState('concierge@allobook.id');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    apiClient<Record<string, string>>('/admin/settings')
      .then((data) => {
        if (data?.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
        if (data?.store_name) setStoreName(data.store_name);
        if (data?.support_email) setSupportEmail(data.support_email);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);

    try {
      await apiClient('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          whatsapp_number: whatsappNumber,
          store_name: storeName,
          support_email: supportEmail,
        }),
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#1a1c1b]">
          Pengaturan WhatsApp Concierge
        </h1>
        <p className="text-xs text-[#414847] mt-0.5">
          Atur nomor WhatsApp tujuan yang menerima rincian pemesanan pelanggan.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#717977]">Memuat konfigurasi...</div>
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4 shadow-sm"
        >
          {savedNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-md flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Pengaturan WhatsApp berhasil diperbarui!
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#414847] mb-1">
              Nomor WhatsApp Concierge *
            </label>
            <input
              type="text"
              required
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Contoh: 6281234567890 (Gunakan kode negara)"
              className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary font-mono"
            />
            <p className="text-[11px] text-[#717977] mt-1">
              Pastikan diawali dengan kode negara (misal 62 untuk Indonesia tanpa tanda +).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414847] mb-1">Nama Toko</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414847] mb-1">
              Email Customer Service
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full text-sm p-2.5 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
