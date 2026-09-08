import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { BookDetailActions } from '@/components/book-detail-actions';
import { ReviewSection } from '@/components/review-section';
import { RecommendationsSection } from '@/components/recommendations-section';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getBookDetail(slug: string) {
  try {
    const book = await apiClient<any>(`/books/${slug}`);
    return book;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookDetail(slug);
  if (!book) return { title: 'Buku Tidak Ditemukan' };

  return {
    title: `${book.title} oleh ${book.author}`,
    description: book.description.slice(0, 160),
    openGraph: {
      title: `${book.title} — AlloBook`,
      description: book.description.slice(0, 160),
      images: book.coverUrl ? [{ url: book.coverUrl }] : [],
    },
  };
}

export default async function BookDetailPage({ params }: Props) {
  const { slug } = await params;
  const book = await getBookDetail(slug);

  if (!book) {
    notFound();
  }

  const defaultCover =
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800';

  // JSON-LD Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: {
      '@type': 'Person',
      name: book.author,
    },
    isbn: book.isbn,
    description: book.description,
    image: book.coverUrl || defaultCover,
    offers: {
      '@type': 'Offer',
      price: book.price,
      priceCurrency: 'IDR',
      availability: book.isPreOrder
        ? 'https://schema.org/PreOrder'
        : book.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
    aggregateRating:
      book.averageRating > 0
        ? {
          '@type': 'AggregateRating',
          ratingValue: book.averageRating,
          reviewCount: book.reviewCount || 1,
        }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-[#414847]">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span>/</span>
          <Link href="/books" className="hover:text-primary">
            Katalog
          </Link>
          <span>/</span>
          <span className="text-[#1a1c1b] font-medium truncate max-w-xs">{book.title}</span>
        </nav>

        {/* Book Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Cover Column */}
          <div className="md:col-span-5 lg:col-span-4">
            <div className="relative aspect-[3/4] w-full rounded-sm overflow-hidden bg-white border border-[#c1c8c6]/50 shadow-md">
              <Image
                src={book.coverUrl || defaultCover}
                alt={book.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover"
              />
              {book.isPreOrder && (
                <div className="absolute top-3 left-3 bg-[#fed65b] text-[#745c00] text-xs font-bold px-2.5 py-1 rounded shadow-sm">
                  PRE-ORDER
                </div>
              )}
            </div>
          </div>

          {/* Details & Actions Column */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Categories */}
              {book.categories && book.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {book.categories.map((c: any) => (
                    <span
                      key={c.id || c.name}
                      className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-[#efeeec] text-[#779691]"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Title & Author */}
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1a1c1b] leading-tight">
                {book.title}
              </h1>
              <p className="text-base sm:text-lg text-[#414847]">
                Penulis: <span className="font-semibold text-[#1a1c1b]">{book.author}</span>
              </p>

              {/* Rating Summary */}
              <div className="flex items-center gap-3 text-sm text-[#735c00] pt-1">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg text-[#fed65b]">star</span>
                  <span className="font-bold text-base">{book.averageRating || 5.0}</span>
                </div>
                <span className="text-[#414847]">•</span>
                <span className="text-xs text-[#414847]">
                  {book.reviewCount || 0} Ulasan Pembaca
                </span>
              </div>

              {/* Price & Stock info */}
              <div className="py-4 border-y border-[#c1c8c6]/30 flex flex-wrap items-baseline gap-4">
                <span className="font-serif text-3xl font-bold text-[#001915]">
                  Rp {Number(book.price).toLocaleString('id-ID')}
                </span>
                {book.isPreOrder ? (
                  <span className="text-xs font-semibold text-[#745c00] bg-[#fed65b]/30 px-2 py-1 rounded">
                    Estimasi Pre-Order 7–14 hari kerja
                  </span>
                ) : book.stock > 0 ? (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    Tersedia: {book.stock} eks.
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded">
                    Stok Habis (Dapat Di-Pre-Order)
                  </span>
                )}
              </div>

              {/* Action Buttons (Client Component) */}
              <BookDetailActions book={book} />

              {/* Meta details list */}
              <div className="grid grid-cols-2 gap-4 text-xs text-[#414847] pt-4">
                {book.isbn && (
                  <div>
                    <span className="block text-[#717977]">ISBN:</span>
                    <span className="font-semibold text-[#1a1c1b]">{book.isbn}</span>
                  </div>
                )}
                {book.publishedAt && (
                  <div>
                    <span className="block text-[#717977]">Tahun Terbit:</span>
                    <span className="font-semibold text-[#1a1c1b]">
                      {new Date(book.publishedAt).getFullYear()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 pt-6 border-t border-[#c1c8c6]/30">
              <h2 className="font-serif text-lg font-bold text-[#1a1c1b]">Sinopsis &amp; Deskripsi</h2>
              <div className="text-sm text-[#414847] leading-relaxed whitespace-pre-line font-sans">
                {book.description}
              </div>
            </div>
          </div>
        </div>

        {/* Semantic AI Recommendations */}
        <RecommendationsSection slug={book.slug} />

        {/* Reviews Section */}
        <ReviewSection bookSlug={book.slug} bookId={book.id} reviews={book.reviews || []} />
      </div>
    </>
  );
}
