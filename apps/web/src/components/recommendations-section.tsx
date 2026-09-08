'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { BookCard } from '@/components/book-card';

interface RecommendationItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  price: number;
  stock: number;
  isPreOrder: boolean;
  similarity?: number;
}

export function RecommendationsSection({ slug }: { slug: string }) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    apiClient<{ items: RecommendationItem[] }>(`/books/${slug}/recommendations?limit=6`)
      .then((res) => {
        if (isMounted) {
          setRecommendations(res.items || []);
        }
      })
      .catch(() => {
        if (isMounted) setRecommendations([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <section className="pt-12 border-t border-[#c1c8c6]/40 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-[#779691] flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-sm text-[#0f2e2a]">auto_awesome</span>
            Rekomendasi AI Semantik
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1a1c1b]">
            You Might Also Like
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-[#f4f3f1] border border-[#c1c8c6]/30 rounded-md aspect-[3/4] flex flex-col justify-end p-3 space-y-2"
            >
              <div className="h-4 bg-[#c1c8c6]/50 rounded w-3/4"></div>
              <div className="h-3 bg-[#c1c8c6]/40 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {recommendations.map((item) => (
            <BookCard key={item.id} book={item} />
          ))}
        </div>
      )}
    </section>
  );
}
