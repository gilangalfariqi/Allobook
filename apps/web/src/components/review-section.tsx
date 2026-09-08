'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Review {
  id: string;
  rating: number;
  body: string;
  imageUrls: string[];
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export function ReviewSection({
  bookSlug,
  bookId,
  reviews: initialReviews,
}: {
  bookSlug: string;
  bookId: string;
  reviews: Review[];
}) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingSummary(true);

    apiClient<{ summary: string; cachedAt: string | null }>(`/books/${bookSlug}/review-summary`)
      .then((res) => {
        if (isMounted) setAiSummary(res.summary);
      })
      .catch(() => {
        if (isMounted) setAiSummary(null);
      })
      .finally(() => {
        if (isMounted) setLoadingSummary(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookSlug]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    if (body.trim().length < 5) {
      setErrorMsg('Ulasan minimal 5 karakter');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const newReview = await apiClient<Review>(`/books/${bookSlug}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          bookId,
          rating,
          body,
          imageUrls: [],
        }),
      });

      setReviews([newReview, ...reviews]);
      setBody('');
      setRating(5);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim ulasan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pt-12 border-t border-[#c1c8c6]/40 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#779691] block mb-1">
            Komunitas Pembaca
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1c1b]">
            Ulasan &amp; Penilaian ({reviews.length})
          </h2>
        </div>
      </div>

      {/* Review Form */}
      <div className="bg-white border border-[#c1c8c6]/40 rounded-lg p-6 space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1a1c1b]">
          {user ? 'Tulis Ulasan Anda' : 'Masuk untuk Menulis Ulasan'}
        </h3>

        {user ? (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating Stars */}
            <div>
              <label className="block text-xs font-semibold text-[#414847] mb-1">Penilaian</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 text-2xl text-[#fed65b] focus:outline-none"
                  >
                    <span className="material-symbols-outlined">
                      {star <= rating ? 'star' : 'star_border'}
                    </span>
                  </button>
                ))}
                <span className="text-xs font-semibold text-[#735c00] ml-2">{rating} dari 5</span>
              </div>
            </div>

            {/* Review Body */}
            <div>
              <label className="block text-xs font-semibold text-[#414847] mb-1">
                Ulasan Buku
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Bagikan pemikiran, kutipan favorit, atau pengalaman membaca buku ini..."
                rows={4}
                className="w-full text-sm p-3 bg-[#f4f3f1] border border-[#c1c8c6]/50 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
            </button>
          </form>
        ) : (
          <div>
            <p className="text-xs text-[#414847] mb-3">
              Bergabunglah dengan komunitas pembaca kami untuk membagikan review.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary-container"
            >
              Masuk Sekarang
            </button>
          </div>
        )}
      </div>

      {/* AI Review Summary Card */}
      {loadingSummary ? (
        <div className="bg-[#fbfaf8] border border-[#0f2e2a]/15 rounded-lg p-5 shadow-sm space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#c1c8c6]/50 rounded-full"></div>
            <div className="h-4 bg-[#c1c8c6]/50 rounded w-48"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3.5 bg-[#c1c8c6]/40 rounded w-full"></div>
            <div className="h-3.5 bg-[#c1c8c6]/40 rounded w-5/6"></div>
            <div className="h-3.5 bg-[#c1c8c6]/40 rounded w-2/3"></div>
          </div>
        </div>
      ) : aiSummary ? (
        <div className="bg-gradient-to-br from-[#fbfaf8] to-white border border-[#0f2e2a]/15 rounded-lg p-5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f2e2a] uppercase tracking-wider">
              <span className="material-symbols-outlined text-base text-[#779691]">auto_awesome</span>
              <span>Ringkasan Ulasan AI</span>
            </div>
            <span className="text-[11px] text-[#717977] bg-[#f4f3f1] px-2 py-0.5 rounded font-mono">
              Claude Haiku
            </span>
          </div>
          <p className="text-sm text-[#414847] leading-relaxed whitespace-pre-line font-sans italic">
            "{aiSummary}"
          </p>
        </div>
      ) : null}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 bg-white border border-[#c1c8c6]/30 rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#0f2e2a] text-[#c8e9e3] flex items-center justify-center font-bold text-xs">
                    {rev.user?.name ? rev.user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[#1a1c1b]">
                      {rev.user?.name || 'Pembaca Terverifikasi'}
                    </span>
                    <div className="flex items-center gap-1 text-[#fed65b]">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <span key={i} className="material-symbols-outlined text-xs">
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-[#717977]">
                  {new Date(rev.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#414847] leading-relaxed pt-1">{rev.body}</p>

              {rev.imageUrls && rev.imageUrls.length > 0 && (
                <div className="flex gap-2 pt-2">
                  {rev.imageUrls.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden">
                      <Image src={url} alt="Review attachment" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-[#717977] italic py-4">
            Belum ada ulasan untuk buku ini. Jadilah yang pertama memberikan ulasan!
          </p>
        )}
      </div>
    </section>
  );
}
