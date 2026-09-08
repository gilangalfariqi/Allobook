'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import Image from 'next/image';

export default function AdminBooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('95000');
  const [stock, setStock] = useState('10');
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const handleAutoEnrich = async () => {
    if (!title.trim()) {
      alert('Silakan isi judul buku terlebih dahulu');
      return;
    }
    setEnriching(true);
    try {
      const res = await apiClient<{ description: string; suggestedTags: string[] }>('/admin/books/enrich', {
        method: 'POST',
        body: JSON.stringify({ title, author: author || 'Penulis' }),
      });
      if (res.description) {
        setDescription(res.description);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghasilkan deskripsi AI');
    } finally {
      setEnriching(false);
    }
  };

  const fetchBooks = () => {
    setLoading(true);
    apiClient<{ items: any[] }>('/books?limit=50')
      .then((data) => setBooks(data.items || []))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient('/books', {
        method: 'POST',
        body: JSON.stringify({
          title,
          author,
          description,
          price: Number(price),
          stock: Number(stock),
          isPreOrder,
          coverUrl: coverUrl || null,
        }),
      });
      setShowAddModal(false);
      setTitle('');
      setAuthor('');
      setDescription('');
      setCoverUrl('');
      fetchBooks();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan buku');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus buku ini?')) return;
    try {
      await apiClient(`/books/${id}`, { method: 'DELETE' });
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert('Gagal menghapus buku');
    }
  };

  const defaultCover =
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200';

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1a1c1b]">Kelola Katalog Buku</h1>
          <p className="text-xs text-[#414847] mt-0.5">
            Tambah judul baru, perbarui ketersediaan, atau atur buku pre-order.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-container transition-colors flex items-center gap-1 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Tambah Buku Baru</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#717977]">Memuat katalog...</div>
      ) : (
        <div className="bg-white border border-[#c1c8c6]/40 rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f4f3f1] border-b border-[#c1c8c6]/40 text-[#414847]">
                <th className="p-3 font-semibold">Cover</th>
                <th className="p-3 font-semibold">Judul &amp; Penulis</th>
                <th className="p-3 font-semibold">Tipe</th>
                <th className="p-3 font-semibold">Harga</th>
                <th className="p-3 font-semibold">Stok</th>
                <th className="p-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c1c8c6]/20">
              {books.map((book) => (
                <tr key={book.id} className="hover:bg-[#faf9f7] transition-colors">
                  <td className="p-3">
                    <div className="relative w-10 h-14 rounded overflow-hidden bg-[#f4f3f1] border">
                      <Image
                        src={book.coverUrl || defaultCover}
                        alt={book.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="p-3 max-w-xs">
                    <p className="font-semibold text-[#1a1c1b] line-clamp-1">{book.title}</p>
                    <p className="text-[#717977]">{book.author}</p>
                  </td>
                  <td className="p-3">
                    {book.isPreOrder ? (
                      <span className="bg-[#fed65b] text-[#745c00] text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Pre-Order
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Ready Stock
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-semibold">
                    Rp {Number(book.price).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3">{book.stock}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="p-1.5 text-[#ba1a1a] hover:bg-rose-50 rounded"
                      title="Hapus Buku"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold">Tambah Buku Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#717977] hover:text-[#1a1c1b]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Judul Buku *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded bg-[#f4f3f1]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Penulis *</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full p-2 border rounded bg-[#f4f3f1]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold">Deskripsi / Sinopsis *</label>
                  <button
                    type="button"
                    onClick={handleAutoEnrich}
                    disabled={enriching}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-container disabled:opacity-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {enriching ? 'hourglass_top' : 'auto_awesome'}
                    </span>
                    <span>{enriching ? 'Menghasilkan...' : '✨ Auto-generate AI'}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sinopsis atau ringkasan isi buku..."
                  className="w-full p-2 border rounded bg-[#f4f3f1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Harga (IDR) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2 border rounded bg-[#f4f3f1]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Stok *</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full p-2 border rounded bg-[#f4f3f1]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">URL Cover Buku (Opsional)</label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 border rounded bg-[#f4f3f1]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="preorder"
                  checked={isPreOrder}
                  onChange={(e) => setIsPreOrder(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="preorder" className="font-semibold cursor-pointer">
                  Tandai Sebagai Buku Pre-Order
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded text-[#414847]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-white rounded font-bold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Buku'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
