# AlloBook

AlloBook is a semi e-commerce platform for books focusing on Discovery, Reviews, and a WhatsApp-based Pre-Order (PO) system.

## Breaking Change: PostgreSQL pgvector Migration (Phase 9)

> **PENTING (Breaking Change):** Image database PostgreSQL telah diperbarui ke `pgvector/pgvector:pg16` untuk mendukung semantic vector embeddings. Volume lama `postgres_data` tidak kompatibel secara langsung karena perbedaan base libc (risiko collation corruption).
>
> Jika Anda memperbarui dari versi sebelumnya, Anda **wajib** melakukan drop volume lama dan migrasi ulang:
> ```bash
> # 1. Hentikan container dan hapus volume database lama
> docker-compose down -v
>
> # 2. Jalankan container dengan image pgvector baru
> docker-compose up -d
>
> # 3. Jalankan migrasi Prisma dari awal
> pnpm --filter @allobook/api prisma migrate dev
>
> # 4. Seed database dengan data katalog buku terbaru
> pnpm --filter @allobook/api run db:seed
>
> # 5. (Opsional) Jalankan backfill semantic embeddings
> pnpm --filter @allobook/api run embeddings:backfill
> ```

## Local Setup

1. Start the required services (PostgreSQL with pgvector, Redis, Meilisearch, n8n):
   ```bash
   docker-compose up -d
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Setup environment variables:
   Copy `.env.example` to `.env` dan `apps/api/.env.example` to `apps/api/.env`, lalu sesuaikan variabel (termasuk `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, dan `N8N_WEBHOOK_SECRET`).

4. Run migrations & seed:
   ```bash
   pnpm --filter @allobook/api prisma migrate dev
   pnpm --filter @allobook/api run db:seed
   ```

5. Start development servers:
   ```bash
   pnpm dev
   ```

## Background Jobs & AI Utilities

- **Backfill Embeddings**:
  ```bash
  pnpm --filter @allobook/api run embeddings:backfill
  ```
- **n8n Automation**:
  Akses antarmuka n8n di `http://localhost:5678` (kredensial default pada `.env`). Workflow templates tersimpan di folder `infra/n8n/workflows/`.

