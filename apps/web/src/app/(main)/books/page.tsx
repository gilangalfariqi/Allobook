import { BookCard } from '@/components/book-card';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface CatalogProps {
  searchParams: Promise<{
    page?: string;
    genre?: string;
    sort?: string;
    search?: string;
    isPreOrder?: string;
  }>;
}

async function getBooks(query: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', query.page);
  if (query.genre) params.set('genre', query.genre);
  if (query.sort) params.set('sort', query.sort);
  if (query.search) params.set('search', query.search);
  if (query.isPreOrder) params.set('isPreOrder', query.isPreOrder);
  params.set('limit', '12');

  try {
    const data = await apiClient<{
      items: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/books?${params.toString()}`);
    return data;
  } catch {
    return {
      items: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
    };
  }
}

export default async function CatalogPage({ searchParams }: CatalogProps) {
  const resolvedParams = await searchParams;
  const currentGenre = resolvedParams.genre || '';
  const currentSort = resolvedParams.sort || 'newest';
  const currentSearch = resolvedParams.search || '';
  const isPreOrderOnly = resolvedParams.isPreOrder === 'true';
  const currentPage = Number(resolvedParams.page) || 1;

  const { items: books, pagination } = await getBooks(resolvedParams);

  const genres = [
    { label: 'Semua Koleksi', value: '' },
    { label: 'Fiksi & Sastra', value: 'fiction' },
    { label: 'Non-Fiksi', value: 'non-fiction' },
    { label: 'Filsafat', value: 'philosophy' },
    { label: 'Sains & Bisnis', value: 'science' },
    { label: 'Sejarah', value: 'history' },
  ];

  return (
    <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#c1c8c6]/40 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#779691] block mb-1">
            Eksplorasi Perpustakaan
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1a1c1b]">
            {isPreOrderOnly
              ? 'Buku Pre-Order'
              : currentSearch
                ? `Hasil Pencarian: "${currentSearch}"`
                : 'Katalog Buku'}
          </h1>
        </div>
        <p className="text-xs text-[#414847]">
          Menampilkan <span className="font-semibold text-[#1a1c1b]">{books.length}</span> dari{' '}
          <span className="font-semibold text-[#1a1c1b]">{pagination.total}</span> buku
        </p>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Genre Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {genres.map((g) => {
            const isActive = currentGenre === g.value && !isPreOrderOnly;
            const href = g.value ? `/books?genre=${g.value}` : '/books';
            return (
              <Link
                key={g.label}
                href={href}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-[#001915] text-white shadow-sm'
                    : 'bg-[#efeeec] text-[#414847] hover:bg-[#e3e2e0]'
                }`}
              >
                {g.label}
              </Link>
            );
          })}

          {/* Pre-Order Toggle Pill */}
          <Link
            href={isPreOrderOnly ? '/books' : '/books?isPreOrder=true'}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-1 ${
              isPreOrderOnly
                ? 'bg-[#fed65b] text-[#745c00] shadow-sm'
                : 'bg-[#efeeec] text-[#745c00] hover:bg-[#fed65b]/40'
            }`}
          >
            <span className="material-symbols-outlined text-sm">hourglass_top</span>
            <span>Khusus Pre-Order</span>
          </Link>
        </div>

        {/* Sort Links */}
        <div className="flex items-center gap-2 text-xs text-[#414847]">
          <span className="font-medium">Urutkan:</span>
          <Link
            href={`/books?sort=newest${currentGenre ? `&genre=${currentGenre}` : ''}${
              isPreOrderOnly ? '&isPreOrder=true' : ''
            }`}
            className={`hover:text-primary ${
              currentSort === 'newest' ? 'font-bold text-primary underline' : ''
            }`}
          >
            Terbaru
          </Link>
          <span>•</span>
          <Link
            href={`/books?sort=price-low${currentGenre ? `&genre=${currentGenre}` : ''}${
              isPreOrderOnly ? '&isPreOrder=true' : ''
            }`}
            className={`hover:text-primary ${
              currentSort === 'price-low' ? 'font-bold text-primary underline' : ''
            }`}
          >
            Harga Terendah
          </Link>
          <span>•</span>
          <Link
            href={`/books?sort=price-high${currentGenre ? `&genre=${currentGenre}` : ''}${
              isPreOrderOnly ? '&isPreOrder=true' : ''
            }`}
            className={`hover:text-primary ${
              currentSort === 'price-high' ? 'font-bold text-primary underline' : ''
            }`}
          >
            Harga Tertinggi
          </Link>
        </div>
      </div>

      {/* Book Grid */}
      {books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-[#c1c8c6]/40 rounded-lg p-8">
          <span className="material-symbols-outlined text-5xl text-[#717977]">search_off</span>
          <h3 className="font-serif text-lg font-bold text-[#1a1c1b] mt-3">Tidak Ada Buku Ditemukan</h3>
          <p className="text-xs text-[#414847] mt-1">
            Coba ubah kata kunci pencarian atau pilih kategori lain.
          </p>
          <div className="mt-6">
            <Link
              href="/books"
              className="inline-flex items-center gap-1 text-xs font-semibold px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-container"
            >
              Reset Filter
            </Link>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {Array.from({ length: pagination.totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const isActive = pageNum === currentPage;
            return (
              <Link
                key={pageNum}
                href={`/books?page=${pageNum}${currentGenre ? `&genre=${currentGenre}` : ''}${
                  currentSort ? `&sort=${currentSort}` : ''
                }${isPreOrderOnly ? '&isPreOrder=true' : ''}`}
                className={`w-9 h-9 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-white border border-[#c1c8c6]/50 text-[#1a1c1b] hover:bg-[#f4f3f1]'
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
