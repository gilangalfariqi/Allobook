# 📚 AlloBook — AI-Powered Book Discovery & Concierge Pre-Order Platform

AlloBook adalah platform web **semi e-commerce untuk kurasi buku** berskala *production-grade* yang dibangun dengan arsitektur **TypeScript Monorepo (Turborepo + pnpm)**. Platform ini menggabungkan dua pilar utama:

1. **Review, Curated Discovery & AI Assistant** — Pencarian buku instan (*typo-tolerant*) dengan **Meilisearch**, rekomendasi semantik berbasis vektor (**PostgreSQL `pgvector` + OpenAI Embeddings**), rangkuman ulasan otomatis (**Anthropic Claude Haiku**), serta asisten kurator pintar **AlloBot (Multi-Source RAG Chatbot dengan Claude Sonnet & SSE Streaming)**.
2. **Concierge Pre-Order (PO) System** — Pemesanan buku pre-order yang terintegrasi langsung dengan **WhatsApp Concierge** (mendukung *Guest Checkout* maupun *Authenticated Checkout*), pelacakan status pesanan *end-to-end* (`PENDING → PROCESSING → CONFIRMED → SHIPPED → DONE`), dan automasi notifikasi menggunakan **BullMQ** & **n8n**.

---

## ✨ Fitur Unggulan (Standout Features)

### 🧠 1. AI, Semantic Search & Multi-Source RAG Engine
- **AlloBot — Multi-Source RAG Chatbot (`/chatbot/*` & `/ai/chat`):**
  - **Hybrid Intent Router:** Mengklasifikasikan pesan pengguna menggunakan **Claude 3.5 Haiku** (dengan *fallback* deterministik berbasis *regex/rules*) ke dalam 4 intent: `book_recommendation`, `order_status`, `store_faq`, dan `general_parenting`.
  - **Multi-Source Context Retrieval:**
    - `book_recommendation`: Pencarian kemiripan kosinus (*cosine similarity*) pada vektor 1536-dimensi di **PostgreSQL `pgvector`** (`books.embedding`).
    - `store_faq`: Pencarian semantik pada basis pengetahuan toko (`faq_entries.embedding`).
    - `order_status`: **Mandatory Order Verification** — melindungi privasi pelanggan dengan memvalidasi kombinasi *Order ID* + *Nomor WhatsApp* (`POST /chatbot/verify-order`) dan menerbitkan *scoped JWT token* berdurasi 15 menit sebelum menampilkan detail pesanan.
    - `general_parenting`: Diskusi seputar *read-aloud* dan pemilihan buku sesuai usia anak dengan *guardrails* ketat (menolak diagnosa medis/klinis dan mengalihkan topik di luar domain ke WhatsApp Admin).
  - **Real-Time SSE Streaming & Session Memory:** Menggunakan **Claude 3.5 Sonnet** dengan dukungan *Server-Sent Events* (`?stream=true`) dan penyimpanan riwayat percakapan di **Redis** (maksimal 10 pesan terakhir, TTL 24 jam).
- **Semantic Book Recommendations (`GET /books/:slug/recommendations`):** Rekomendasi buku serupa berbasis kemiripan vektor semantik menggunakan `pgvector`, dilengkapi *automatic fallback* berdasarkan kesamaan kategori dan penulis.
- **AI Review Summarization (`GET /books/:slug/review-summary`):** Merangkum seluruh ulasan pembaca menjadi ringkasan objektif menggunakan **Claude Haiku**, lengkap dengan mekanisme *smart cache invalidation* (`reviewSummaryCache` & `reviewSummaryUpdatedAt` yang dibandingkan terhadap *timestamp* ulasan terbaru).
- **AI Catalog Content Enrichment (`POST /admin/books/enrich`):** Membantu Admin membuat sinopsis promosi Bahasa Indonesia (100–150 kata) dan rekomendasi *genre tags* secara otomatis dari judul dan nama penulis.
- **AI Token & Cost Auditing (`AiUsageLog`):** Mencatat jumlah *prompt tokens*, *completion tokens*, dan estimasi biaya dalam USD untuk setiap pemanggilan endpoint AI di database.

### 🛒 2. Concierge Pre-Order & E-Commerce Experience
- **Instant & Typo-Tolerant Search:** Pencarian real-time dan *auto-suggest* di katalog buku menggunakan **Meilisearch**.
- **Hybrid Guest & Authenticated Checkout:**
  - Kolom `userId` pada tabel `Order` bersifat *nullable*, memungkinkan pelanggan memesan langsung tanpa wajib membuat akun (*Guest Checkout*).
  - Jika pelanggan login, pesanan otomatis tertaut ke akun mereka dan tampil di halaman **My Account → Orders**.
- **WhatsApp Concierge Flow:** Menghasilkan tautan langsung (`wa.me/{number}?text=...`) berisi rincian pesanan dan alamat pengiriman terformat. Nomor WhatsApp toko bersifat dinamis dan dapat diubah kapan saja oleh Admin melalui tabel `StoreSettings` (dengan *fallback* ke variabel `.env`).
- **Canonical Order Status Mapping:** Satu sumber kebenaran (*single source of truth*) di `@allobook/shared-types` yang menyinkronkan enum database dengan label UI:
  - `PENDING` → *"Waiting Confirmation"*
  - `PROCESSING` → *"PO Processing"*
  - `CONFIRMED` → *"Confirmed"*
  - `SHIPPED` → *"Shipped"*
  - `DONE` → *"Completed"*
  - `CANCELLED` → *"Cancelled"*
- **Wishlist & Verified Reviews with Media Upload:** Pengguna dapat menyimpan buku favorit ke Wishlist dan mengunggah foto ulasan langsung ke **Cloudflare R2** (S3-compatible object storage).

### ⚙️ 3. Background Jobs, Automation & Production Engineering
- **Asynchronous Queue (`BullMQ` + `Redis`):** Memproses pembuatan *vector embeddings* buku secara asinkron di latar belakang (`book-embedding` worker) serta antrean pengiriman email transaksional.
- **n8n Workflow Automation (`infra/n8n/workflows/`):** Integrasi *webhook* dua arah yang diamankan dengan header `X-Webhook-Secret` untuk notifikasi pesanan otomatis (`order-notification.json`) dan sinkronisasi saran buku baru (`scheduled-book-sync.json`).
- **Two-URL Database Connection Pattern:** Memisahkan `DATABASE_URL` (PgBouncer Transaction Pooler port `6543` untuk ribuan query runtime konkuren) dan `DIRECT_URL` (Session/Direct Connection port `5432` khusus untuk `prisma migrate`) guna mencegah *advisory lock hang* pada infrastruktur cloud (Supabase/Back4App).

---

## 🛠️ Tech Stack & Tools

### Frontend (`apps/web`)
| Kategori | Teknologi / Library | Kegunaan |
|---|---|---|
| **Framework** | **Next.js 15.1 (App Router)** + **React 19** + **TypeScript 5** | SSR, ISR, Dynamic Metadata, OpenGraph Image, JSON-LD SEO |
| **Styling & Design** | **Tailwind CSS 3.4** + **shadcn/ui** (`clsx`, `tailwind-merge`) | Tema *Oxford Emerald* (`#001915`), desain *Mobile-First* |
| **Typography & Icons** | **Libre Caslon Text**, **Hanken Grotesk**, **Material Symbols Outlined**, `lucide-react` | Tipografi editorial & ikon variabel sesuai sistem desain |
| **Server State** | **TanStack Query v5 (`@tanstack/react-query`)** | Fetching API, caching, sinkronisasi data server |
| **Client State** | **Zustand v4** | State keranjang belanja (`cart`), `wishlist`, dan *floating chatbot widget* |
| **Form & Validation** | **React Hook Form v7** + **Zod** (`@hookform/resolvers`) | Validasi form *client-side* dengan skema bersama dari `@allobook/shared-types` |
| **Error Monitoring** | **Sentry (`@sentry/nextjs`)** | Pelacakan error & performa di sisi browser/Next.js server |

### Backend (`apps/api`)
| Kategori | Teknologi / Library | Kegunaan |
|---|---|---|
| **Runtime & Framework** | **Node.js 20 LTS** + **Fastify v4** + **TypeScript 5** | REST API performa tinggi dengan *Clean Layered Architecture* |
| **ORM & Database** | **Prisma ORM v5** + **PostgreSQL 16 (`pgvector/pgvector:pg16`)** | Database relasional utama + ekstensi vektor 1536-dimensi |
| **AI & LLM SDKs** | **Anthropic SDK (`@anthropic-ai/sdk`)** + **OpenAI SDK (`openai`)** | Claude 3.5 Sonnet (RAG), Claude 3.5 Haiku (Router/Summary), `text-embedding-3-small` |
| **Search Engine** | **Meilisearch (`meilisearch`)** | Pencarian instan, *typo-tolerant*, filter genre & penulis |
| **Cache & Queue** | **Redis 7 (`ioredis`)** + **BullMQ (`bullmq`)** | Caching API, memori sesi chatbot, dan *background job workers* |
| **Authentication** | **`@fastify/jwt`** + **`argon2`** + **`@fastify/cookie`** | Autentikasi JWT (Access + Refresh Token terpisah) & hashing Argon2id |
| **Security & Guardrails** | **`@fastify/helmet`**, **`@fastify/cors`**, **`@fastify/rate-limit`** | Proteksi header HTTP, CORS dinamis, & pembatasan request per IP |
| **Object Storage** | **AWS SDK S3 (`@aws-sdk/client-s3`)** + **`@fastify/multipart`** | Upload sampul buku (maks 5MB) & foto review (maks 2MB) ke **Cloudflare R2** |
| **API Documentation** | **`@fastify/swagger`** + **`@fastify/swagger-ui`** + **`zod-to-json-schema`** | Dokumentasi OpenAPI 3.0 interaktif otomatis di endpoint `/docs` |
| **Logging & Monitoring** | **Pino (`pino`, `pino-pretty`)** + **Sentry (`@sentry/node`)** | Structured JSON logging & pemantauan error produksi |
| **Email Service** | **Nodemailer (`nodemailer`)** | Pengiriman email konfirmasi dan pembaruan status PO |

### Monorepo, Testing & DevOps
| Kategori | Teknologi / Library | Kegunaan |
|---|---|---|
| **Monorepo Orchestrator** | **pnpm Workspaces (`pnpm@9`)** + **Turborepo (`turbo`)** | Manajemen paket terpusat & *pipeline build caching* |
| **Shared Packages** | **`@allobook/shared-types`** & **`@allobook/config`** | Skema Zod, tipe TypeScript, konstanta status order, & konfigurasi ESLint/TSConfig |
| **Bundler** | **esbuild** | Kompilasi super cepat untuk *production bundle* API & script *seed* |
| **Unit & Integration Test** | **Vitest** | Pengujian unit pada layer *Service*, *Intent Router*, dan komponen UI |
| **End-to-End (E2E) Test** | **Playwright (`@playwright/test`)** | Pengujian skenario nyata di *Desktop Chrome* & *Mobile Pixel 5* (`e2e/`) |
| **Workflow Automation** | **n8n (`n8nio/n8n`)** | Automasi alur kerja notifikasi & kurasi buku berbasis *webhook* |
| **Container & CI/CD** | **Docker**, **Docker Compose**, **GitHub Actions (`.github/workflows/ci.yml`)** | Kontainerisasi layanan lokal/produksi & *pipeline* validasi otomatis |

---

## 🏗️ Arsitektur & Struktur Monorepo

```text
allobook/
├── apps/
│   ├── api/                        # Backend Fastify API (Port 3001)
│   │   ├── prisma/                 # schema.prisma, migrations, & Open Library seed.ts
│   │   ├── scripts/                # Utilitas CLI (backfill-embeddings.ts)
│   │   └── src/
│   │       ├── config/             # Validasi environment variables dengan Zod
│   │       ├── lib/                # Pino logger, custom AppError classes, Sentry init
│   │       ├── plugins/            # Fastify plugins (prisma, redis, meilisearch, jwt)
│   │       ├── modules/            # Clean Layered Architecture per domain:
│   │       │   ├── auth/           # Register, Login, Refresh JWT, Profile (/auth)
│   │       │   ├── book/           # CRUD Katalog Buku & Slug lookup (/books)
│   │       │   ├── review/         # Ulasan & Rating Pembaca (/reviews)
│   │       │   ├── order/          # Pre-Order Concierge & Guest Checkout (/orders)
│   │       │   ├── wishlist/       # Daftar Keinginan Pengguna (/wishlist)
│   │       │   ├── search/         # Integrasi Instant Search Meilisearch (/search)
│   │       │   ├── upload/         # Upload Media ke Cloudflare R2 (/uploads)
│   │       │   ├── admin/          # Statistik Toko & StoreSettings (/admin)
│   │       │   ├── ai/             # Rekomendasi Vektor, Ringkasan Review, Enrichment, Webhook
│   │       │   └── chatbot/        # AlloBot Intent Router, Multi-Source RAG, Order Verification
│   │       └── server.ts           # Entry point Fastify
│   └── web/                        # Frontend Next.js 15 App Router (Port 3000)
│       └── src/
│           ├── app/                # Route groups: (main), (auth), admin
│           ├── components/         # Komponen UI, Katalog, & Floating Chatbot Widget
│           ├── hooks/              # Custom hooks & TanStack Query hooks
│           └── store/              # Zustand stores (cart, wishlist, chat)
├── packages/
│   ├── shared-types/               # Single Source of Truth: Zod schemas, TS types, ORDER_STATUS_LABELS
│   └── config/                     # Preset bersama untuk ESLint & TypeScript (tsconfig)
├── infra/
│   └── n8n/workflows/              # Template workflow n8n (order-notification & scheduled-book-sync)
├── e2e/                            # Playwright E2E test suites (catalog, checkout, order-tracking)
├── stitch_allo_book_catalog_system/# Referensi desain UI/UX (DESIGN.md, HTML & mockup layar)
├── .github/workflows/ci.yml        # GitHub Actions CI Pipeline
├── docker-compose.yml              # Infrastruktur lokal: Postgres 16 (pgvector), Redis 7, Meilisearch, n8n
├── Dockerfile                      # Production container image untuk Backend API
└── turbo.json                      # Konfigurasi pipeline Turborepo
```

### Pola Arsitektur Backend (Strict Layered Architecture)
Seluruh modul di `apps/api/src/modules/*` mematuhi pemisahan tanggung jawab berlapis:
```text
Route (Fastify Schema & Rate Limit) ──► Controller (HTTP Req/Res) ──► Service (Business Logic & AI/Queue) ──► Repository (Prisma & pgvector Queries) ──► Database
```

---

## 🗄️ Skema Database (Prisma & PostgreSQL `pgvector`)

| Model | Tabel | Deskripsi |
|---|---|---|
| `User` | `users` | Data pengguna & staf (`role`: `USER` \| `ADMIN`), password di-hash dengan `argon2`. |
| `Book` | `books` | Katalog buku lengkap dengan kolom `embedding` (`vector(1536)`), `reviewSummaryCache`, dan flag `isPreOrder`. |
| `Category` & `BookCategory` | `categories`, `book_categories` | Relasi *many-to-many* antara buku dan genre/kategori. |
| `Review` | `reviews` | Ulasan buku (rating 1–5, teks ulasan, dan array `imageUrls` dari Cloudflare R2). |
| `Wishlist` | `wishlists` | Buku yang disimpan pengguna dengan *unique constraint* `@@unique([userId, bookId])`. |
| `Order` & `OrderItem` | `orders`, `order_items` | Data pesanan PO (`userId` *nullable* untuk *guest checkout*, `shippingAddress` bertipe `Json`, dan `status` enum). |
| `StoreSettings` | `store_settings` | Penyimpanan *key-value* dinamis untuk konfigurasi toko (seperti `whatsapp_number`). |
| `FaqEntry` | `faq_entries` | Basis pengetahuan toko dengan kolom `embedding` (`vector(1536)`) untuk pencarian RAG AlloBot. |
| `AiUsageLog` | `ai_usage_logs` | Pencatatan audit pemakaian token (`promptTokens`, `completionTokens`) dan estimasi biaya AI. |

---

## 🔌 Ringkasan Endpoint API

Dokumentasi OpenAPI/Swagger interaktif tersedia secara langsung saat server berjalan di **`http://localhost:3001/docs`**.

| Grup | Method & Endpoint | Akses & Rate Limit | Deskripsi |
|---|---|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login` | Publik (10 req / 15 mnt) | Registrasi & login pengguna (mengembalikan Access & Refresh JWT) |
| **Auth** | `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Publik / Auth JWT | Pembaruan token sesi & profil pengguna aktif |
| **Books** | `GET /books`, `GET /books/:slug` | Publik | Daftar katalog buku (ter-cache Redis) & detail buku berdasarkan slug |
| **Books** | `POST /books`, `PUT /books/:id`, `DELETE /books/:id` | Admin Only | Manajemen CRUD buku (otomatis memicu *background job* embedding) |
| **Search** | `GET /search`, `GET /search/suggest` | Publik (60 req / mnt) | Pencarian buku instan & *auto-suggest* via Meilisearch |
| **Reviews** | `GET /books/:slug/reviews`, `POST /books/:slug/reviews`, `DELETE /reviews/:id` | Publik / Auth JWT | Membaca, menulis, dan menghapus ulasan buku |
| **Wishlist** | `GET /wishlist`, `POST /wishlist/:bookId`, `DELETE /wishlist/:bookId` | Auth JWT | Mengelola daftar buku favorit pengguna |
| **Orders** | `POST /orders`, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` | Guest / Auth / Admin | Pembuatan PO (Guest/Auth), riwayat pesanan, & pembaruan status PO |
| **Uploads** | `POST /uploads/cover`, `POST /uploads/review-image` | Admin / Auth JWT | Upload sampul buku & foto review ke Cloudflare R2 |
| **Admin** | `GET /admin/stats`, `GET /admin/settings`, `PUT /admin/settings` | Admin Only | Ringkasan metrik dashboard & pengaturan nomor WhatsApp toko |
| **AI & Recs** | `GET /books/:slug/recommendations` | Publik (30 req / mnt) | Rekomendasi buku semantik menggunakan `pgvector` cosine similarity |
| **AI Summary** | `GET /books/:slug/review-summary` | Publik (30 req / mnt) | Sintesis rangkuman ulasan pembaca menggunakan Claude Haiku |
| **AI Enrich** | `POST /admin/books/enrich`, `POST /admin/books/:id/enrich` | Admin Only | Auto-generate sinopsis buku & saran tag menggunakan Claude Haiku |
| **AlloBot RAG**| `POST /chatbot/message`, `POST /ai/chat` | Publik (20 req / mnt) | Chatbot kurator buku & CS dengan dukungan SSE Streaming (`?stream=true`) |
| **AlloBot Auth**| `POST /chatbot/verify-order`, `GET /chatbot/history/:sessionId` | Publik (10 req / mnt) | Verifikasi kepemilikan pesanan (15m JWT) & riwayat percakapan Redis |
| **FAQ Admin** | `GET /admin/faq`, `POST /admin/faq`, `PUT /admin/faq/:id`, `DELETE /admin/faq/:id` | Publik / Admin Only | Manajemen basis pengetahuan FAQ beserta pembuatan *vector embedding* |
| **Webhooks** | `POST /webhooks/n8n/order-notify`, `POST /admin/books/import-suggestions` | `X-Webhook-Secret` | Endpoint integrasi automasi dengan workflow n8n |

---

## 🚀 Panduan Menjalankan Proyek Secara Lokal (Local Setup)

### Prasyarat
- **Node.js** `>= 20.x` (LTS)
- **pnpm** `>= 9.x` (`npm install -g pnpm@9`)
- **Docker** & **Docker Compose** (untuk menjalankan PostgreSQL `pgvector`, Redis, Meilisearch, dan n8n)

### 1. Jalankan Infrastruktur Docker
```bash
docker-compose up -d
```
> Layanan yang akan berjalan:
> - **PostgreSQL 16 + pgvector:** `localhost:5433` (dipetakan ke port container `5432`)
> - **Redis 7 Alpine:** `localhost:6379`
> - **Meilisearch:** `http://localhost:7700`
> - **n8n Automation UI:** `http://localhost:5678`

> **⚠️ Catatan Migrasi `pgvector`:** Jika Anda sebelumnya pernah menjalankan versi lama dengan image `postgres:16-alpine`, hapus volume lama terlebih dahulu dengan `docker-compose down -v` sebelum menjalankan `docker-compose up -d` agar ekstensi `pgvector` terinisialisasi dengan bersih.

### 2. Instal Dependensi Monorepo
```bash
pnpm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env` di root proyek dan di dalam `apps/api/.env`:
```bash
cp .env.example .env
cp .env.example apps/api/.env
```
Sesuaikan nilai variabel di `.env` (terutama `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, serta opsional `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, dan `N8N_WEBHOOK_SECRET`).
> *Catatan:* Jika semua API key AI dikosongkan, sistem tetap dapat berjalan penuh menggunakan mekanisme **graceful deterministic fallback** yang telah disediakan di setiap modul AI.

### 4. Build Shared Packages, Migrasi Database & Seed Data Buku Asli
```bash
# 1. Build package shared-types
pnpm --filter @allobook/shared-types build

# 2. Generate Prisma Client & jalankan migrasi skema database
pnpm --filter @allobook/api prisma migrate dev

# 3. Build bundle seed & jalankan seeding (mengambil ~50 buku asli dari Open Library API)
pnpm --filter @allobook/api build
pnpm --filter @allobook/api run db:seed

# 4. (Opsional) Backfill semantic vector embeddings untuk seluruh katalog buku
pnpm --filter @allobook/api run embeddings:backfill
```

### 5. Jalankan Server Development
```bash
pnpm dev
```
- **Frontend Web App (Next.js):** `http://localhost:3000`
- **Backend API Server (Fastify):** `http://localhost:3001`
- **Interactive Swagger API Docs:** `http://localhost:3001/docs`

---

## 🧪 Pengujian & Kualitas Kode (Testing & QA)

AlloBook dilengkapi dengan pengujian berlapis menggunakan **Vitest** dan **Playwright**:

```bash
# Jalankan seluruh unit & integration test di semua workspace (API & Web)
pnpm test

# Jalankan unit test khusus Backend API
pnpm --filter @allobook/api test

# Jalankan pemeriksaan tipe TypeScript (Typecheck)
pnpm typecheck

# Jalankan Linter di seluruh proyek
pnpm lint

# Jalankan End-to-End (E2E) test dengan Playwright (Desktop Chrome & Mobile Pixel 5)
pnpm test:e2e
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](./LICENSE).
