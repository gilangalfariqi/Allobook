# CLAUDE.md — AlloBook Project Context

Dokumen ini adalah **context utama** untuk AI coding agent (Claude Code / Cursor / Windsurf / AGY / dsb) saat bekerja di repository ini. Baca dan patuhi seluruh isi file ini sebelum menulis kode apa pun. Jangan menyimpang dari stack, konvensi, dan arsitektur yang didefinisikan di sini kecuali diminta eksplisit oleh user.

---

## 1. Project Overview

**AlloBook** adalah platform web **semi e-commerce untuk buku**, dengan dua pilar utama:

1. **Review & Discovery** — user bisa mencari, membaca detail, dan menulis review/rating buku.
2. **Pre-Order (PO) System** — user bisa melakukan pre-order buku via WhatsApp concierge (bukan checkout instan dengan payment gateway). Status tracking: `PENDING → PROCESSING → CONFIRMED → SHIPPED → DONE`.

Target: **portfolio-grade project** — harus mendemonstrasikan praktik industri nyata (arsitektur bersih, testing, CI/CD, dokumentasi, performa, SEO), bukan sekadar CRUD app.

**Prioritas non-negosiasi:**
- Mobile-first (desain sudah tersedia di `stitch_allo_book_catalog_system/`, ikuti breakpoint dari desain)
- Performa tinggi (Core Web Vitals hijau semua, Lighthouse 90+ semua kategori)
- SEO kuat (halaman buku & review harus terindex sempurna: OG meta, sitemap, structured data JSON-LD)
- Search dengan **auto-suggest/instant search** via Meilisearch
- Arsitektur scalable, siap dipakai perusahaan kecil sampai skala enterprise

---

## 2. Tech Stack (WAJIB DIPAKAI — jangan ganti tanpa alasan kuat)

### Frontend
| Kebutuhan | Tools |
|---|---|
| Framework | **Next.js 15+ (App Router)** + TypeScript |
| Styling | **Tailwind CSS** + **shadcn/ui** |
| Server state | **TanStack Query (React Query)** |
| Client/UI state | **Zustand** |
| Form & validasi | **React Hook Form** + **Zod** |
| Icon (primary) | **Material Symbols Outlined** (Google Fonts, variable font — sesuai design) |
| Icon (utility) | `lucide-react` untuk icon yang tidak ada di Material Symbols |
| Image | `next/image` (wajib, jangan pakai `<img>` biasa) |

> **Catatan Icons:** Design menggunakan Material Symbols Outlined. Pakai itu sebagai primary, lucide-react hanya sebagai fallback utility.

> **Jangan pakai Redux/Redux Toolkit.** Server state = React Query, client state = Zustand.

### Backend
| Kebutuhan | Tools |
|---|---|
| Runtime | **Node.js (LTS)** + TypeScript |
| Framework | **Fastify** |
| ORM | **Prisma** |
| Validasi | **Zod** (schema di-share dengan frontend via `packages/shared-types`) |
| Auth | **JWT** (access + refresh token), password hashing: `argon2` |
| Upload | `@aws-sdk/client-s3` — **Cloudflare R2** |
| Queue/background job | **BullMQ** (notifikasi email PO + AI embedding queue) |
| AI Summarization & Enrichment | **Anthropic Claude Haiku** (`@anthropic-ai/sdk`) |
| AI Chatbot & RAG Assistant | **Anthropic Claude Haiku / Sonnet** (`@anthropic-ai/sdk`) + **pgvector** |
| Semantic Embeddings | **OpenAI text-embedding-3-small** (`openai`) |
| Automation & Webhooks | **n8n** (self-hosted via Docker) |
| Rate limiting | **`@fastify/rate-limit`** — wajib di `/auth/*`, `/search*`, `/books/:slug/recommendations`, `/books/:slug/review-summary`, dan `/ai/chat` |
| API docs | **`@fastify/swagger` + `@fastify/swagger-ui`** — interactive docs di `/docs` |
| Error monitoring | **Sentry** (`@sentry/node`) |

### Database & Search
| Kebutuhan | Tools |
|---|---|
| Database utama | **PostgreSQL 16** with **pgvector** (`pgvector/pgvector:pg16`) |
| Search engine | **Meilisearch** (self-hosted via Docker) |
| Cache | **Redis 7** |

### Infrastruktur & DX
| Kebutuhan | Tools |
|---|---|
| Monorepo | **pnpm workspaces + Turborepo** |
| Storage media | **Cloudflare R2** (cover buku + foto review) |
| Testing unit/integration | **Vitest** |
| Testing E2E | **Playwright** |
| Linting/formatting | **ESLint + Prettier** (strict TypeScript, `noImplicitAny: true`) |
| CI/CD | **GitHub Actions** |
| Error monitoring FE | **Sentry** (`@sentry/nextjs`) |
| Error monitoring BE | **Sentry** (`@sentry/node`) |
| Deployment | Frontend — **Vercel**; Backend + Postgres + Redis + Meilisearch — **Railway/Render** |

---

## 3. Arsitektur Project

### Struktur Monorepo

```
allobook/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # Node.js backend (Fastify)
├── packages/
│   ├── shared-types/        # Tipe TS, Zod schema, dan constants — share FE & BE
│   ├── ui/                  # (opsional) komponen shared
│   └── config/              # eslint/tsconfig shared
├── docker-compose.yml        # Postgres 16, Redis 7, Meilisearch
├── .github/workflows/        # CI/CD pipelines
├── CLAUDE.md                 # Dokumen ini — single source of truth
└── README.md
```

### Backend — Layered Architecture (WAJIB)

Jangan taruh logic bisnis langsung di route handler. Gunakan pola berlapis:

```
Route/Controller → Service (business logic) → Repository (Prisma query) → Database
```

Struktur folder `apps/api/src`:

```
src/
├── modules/
│   ├── auth/         (controller, service, repository, schema, routes)
│   ├── book/
│   ├── review/
│   ├── order/
│   ├── wishlist/
│   ├── search/       # integrasi Meilisearch
│   ├── upload/       # Cloudflare R2 upload
│   └── admin/        # settings, stats
├── plugins/          # Fastify plugins (prisma, redis, jwt, meilisearch, rate-limit, swagger)
├── lib/              # logger (Pino), errors, sentry.ts
├── config/           # Zod-validated env vars
└── server.ts
```

### Frontend — App Router Structure

```
apps/web/src/app/
├── (main)/
│   ├── page.tsx                    # Homepage (ISR)
│   ├── books/
│   │   ├── page.tsx               # Catalog (SSR + React Query)
│   │   └── [slug]/
│   │       ├── page.tsx           # Detail (ISR, generateMetadata, JSON-LD)
│   │       └── opengraph-image.tsx
│   ├── wishlist/page.tsx
│   ├── cart/page.tsx              # Zustand store
│   ├── checkout/page.tsx          # Guest + auth, WhatsApp CTA
│   ├── order-confirmation/page.tsx # Nav-free layout
│   └── orders/
│       ├── page.tsx
│       └── [id]/page.tsx
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── admin/
│   ├── layout.tsx                 # Admin auth guard (role=ADMIN)
│   ├── page.tsx
│   ├── books/page.tsx
│   ├── orders/page.tsx
│   └── settings/page.tsx
└── layout.tsx
```

**Prinsip:** Server Component default untuk data-fetching. `"use client"` hanya untuk komponen interaktif (form, modal, search bar, cart, wishlist toggle).

---

## 4. Model Database & Prisma Schema

### Models (Prisma)

| Model | Fields penting |
|---|---|
| `User` | id, email, name, passwordHash, role(USER/ADMIN), createdAt |
| `Book` | id, slug, title, author, isbn, description, coverUrl, price, stock, isPreOrder, embedding(vector 1536), reviewSummaryCache, reviewSummaryUpdatedAt, publishedAt |
| `Category` | id, name, slug |
| `BookCategory` | bookId, categoryId — `@@unique([bookId, categoryId])` |
| `Review` | id, userId, bookId, rating(1-5), body, imageUrls(String[]), createdAt |
| `Wishlist` | id, userId, bookId, createdAt — `@@unique([userId, bookId])` |
| `Order` | id, **userId(nullable)**, customerName, customerPhone, customerEmail(nullable), status(enum), totalAmount, shippingAddress(Json) |
| `OrderItem` | id, orderId, bookId, quantity, priceAtOrder |
| `StoreSettings` | key(PK), value, updatedAt |
| `AiUsageLog` | id, endpoint, model, promptTokens, completionTokens, tokensUsed, estimatedCost, createdAt |

### Guest Checkout (PENTING)
- `userId` di `Order` adalah **nullable** — guest checkout didukung penuh
- `customerName`, `customerPhone`, `customerEmail` selalu diisi dari form checkout
- Jika user login, `userId` diisi dari JWT dan order muncul di "My Account → Orders"
- Jika guest, `userId = null`, order tersimpan untuk admin, tidak muncul di riwayat akun

---

## 5. Order Status — Canonical Enum Mapping

**Single source of truth:** `packages/shared-types/src/constants/order-status.ts`

```ts
export const OrderStatus = {
  PENDING:    'PENDING',
  PROCESSING: 'PROCESSING',
  CONFIRMED:  'CONFIRMED',
  SHIPPED:    'SHIPPED',
  DONE:       'DONE',
  CANCELLED:  'CANCELLED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:    'Waiting Confirmation',
  PROCESSING: 'PO Processing',
  CONFIRMED:  'Confirmed',
  SHIPPED:    'Shipped',
  DONE:       'Completed',
  CANCELLED:  'Cancelled',
};
```

Dipakai di: Prisma enum, admin dropdown UI, My Account badge, API response, Zod schema.
**Jangan hardcode string label secara terpisah di FE atau BE.**

---

## 6. Checkout — WhatsApp Concierge Flow

AlloBook **tidak menggunakan payment gateway**. Flow checkout:

1. User isi form: Customer Info (nama, nomor WhatsApp, email opsional) + Shipping Info
2. Order dibuat di DB dengan status `PENDING`
3. CTA "Continue to WhatsApp" membuka `wa.me/{whatsapp_number}?text={order_detail_encoded}`
4. Admin konfirmasi manual via WhatsApp dan update status via Admin Order Management

**WhatsApp number:** Diambil dari `StoreSettings` DB (key: `whatsapp_number`), fallback ke `process.env.WHATSAPP_NUMBER`. Admin update via `PUT /admin/settings`.

---

## 7. Upload Module — Cloudflare R2

```
POST  /uploads/cover          # admin only — cover buku (max 5MB, jpg/png/webp)
POST  /uploads/review-image   # auth required — foto review (max 2MB, jpg/png/webp)
```

- SDK: `@aws-sdk/client-s3` dengan R2 endpoint
- Validasi mime type + ukuran dilakukan di BE sebelum upload
- Return: `{ url: string }` — URL publik R2

---

## 8. Fitur Utama

### MVP (wajib)
- Autentikasi (register/login JWT, role: user, admin)
- Listing & detail buku (SSR/ISR, SEO metadata + JSON-LD Book)
- Review & rating buku (upload foto via Cloudflare R2)
- **Wishlist** (MVP — ada di bottom nav design)
- Pre-Order buku (WhatsApp concierge) + status tracking
- Guest checkout
- Search instan + auto-suggest (Meilisearch)
- Dashboard admin: kelola buku, status PO, stok
- Admin Order Management (status dropdown dengan ORDER_STATUS_LABELS)
- StoreSettings (WhatsApp number configurable dari admin)
- Upload module (cover buku, foto review ke R2)
- Rate limiting (@fastify/rate-limit — /auth/*, /search*)
- OpenAPI/Swagger di /docs
- Sentry error monitoring (FE + BE)

### Advanced (setelah MVP)
- Notifikasi email status PO via BullMQ
- Rekomendasi buku sederhana
- Dark mode
- Vercel Analytics / Plausible

---

## 9. API Endpoints (MVP)

```
# Auth (rate-limited: 10 req/15min per IP)
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

# Books
GET    /books
GET    /books/:slug
POST   /books                   # admin only
PUT    /books/:id                # admin only
DELETE /books/:id                # admin only

# Reviews
GET    /books/:slug/reviews
POST   /books/:slug/reviews      # auth required
DELETE /reviews/:id              # own or admin

# Orders
GET    /orders                   # auth — own orders
POST   /orders                   # guest OR auth
GET    /orders/:id
PATCH  /orders/:id/status        # admin only

# Wishlist (auth required)
GET    /wishlist
POST   /wishlist/:bookId
DELETE /wishlist/:bookId

# Search (rate-limited: 60 req/min per IP)
GET    /search?q=&genre=&author=&page=
GET    /search/suggest?q=

# Upload
POST   /uploads/cover            # admin only
POST   /uploads/review-image     # auth required

# Admin
GET    /admin/settings
PUT    /admin/settings
GET    /admin/stats

# AI & Recommendations (Phase 9)
GET    /books/:slug/recommendations   # pgvector semantic recommendations (30 req/min)
GET    /books/:slug/review-summary    # Claude Haiku review summarization (30 req/min)
POST   /admin/books/generate-content  # Claude Haiku auto-generate description & tags

# Chatbot & RAG Assistant (Phase 9)
POST   /chatbot/message               # Router + Multi-source RAG, SSE streaming (?stream=true), 20 req/min
POST   /chatbot/verify-order          # Verify order ownership -> returns 15m scoped JWT
GET    /chatbot/history/:sessionId    # Session history from Redis (max 10 msgs, 24h TTL)
GET    /admin/faq                     # Admin list FAQ entries
POST   /admin/faq                     # Admin create FAQ entry (auto-generates embedding)
PUT    /admin/faq/:id                 # Admin update FAQ entry
DELETE /admin/faq/:id                 # Admin delete FAQ entry

# Automation & Webhooks (Phase 9)
POST   /webhooks/n8n/order-notify     # n8n order notification webhook (X-Webhook-Secret auth)
POST   /admin/books/import-suggestions # n8n automated book import (X-Webhook-Secret auth)

# Docs
GET    /docs                          # Swagger UI
```

---

## 10. Non-Functional Requirements

### Performa
- Lighthouse 90+ semua kategori
- Gambar wajib lewat `next/image` dengan lazy loading
- API response di-cache Redis: listing buku 5min, detail buku 10min
- Prisma query pakai `select` spesifik, hindari over-fetching

### SEO
- Setiap halaman buku: `<title>`, `meta description`, Open Graph, JSON-LD (Book + Review)
- Sitemap.xml auto-generate, robots.txt (disallow /admin)
- URL slug human-readable: /books/laskar-pelangi bukan /books/123

### Mobile-First
- Ikuti breakpoint dan desain dari `stitch_allo_book_catalog_system/` — jangan ubah tanpa konfirmasi
- Touch target minimal 44x44px

### Keamanan
- Validasi input di FE (Zod) **dan** BE (double validation)
- Rate limit /auth/* dan /search*
- Simpan semua secret di .env, jangan commit .env asli
- Upload: validasi mime type + ukuran di server sebelum kirim ke R2

---

## 11. Konvensi Kode

- **TypeScript strict mode** di seluruh project (FE & BE)
- Naming: `camelCase` variabel/fungsi, `PascalCase` komponen/class/type, `kebab-case` nama file non-komponen
- Commit message: **Conventional Commits** (feat:, fix:, chore:, refactor:, dll.)
- Setiap fitur baru wajib ada minimal unit test untuk service/logic utamanya
- Tidak ada `any` tanpa justifikasi eksplisit di komentar
- `zod` schema = single source of truth validasi
- `packages/shared-types` = single source of truth untuk tipe, schema, dan constants (termasuk ORDER_STATUS_LABELS)

---

## 12. Environment Variables (.env.example wajib ada)

```bash
DATABASE_URL=postgresql://allobook:password@localhost:5432/allobook
REDIS_URL=redis://localhost:6379
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=masterKey
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=allobook-media
R2_PUBLIC_URL=https://pub-xxx.r2.dev
WHATSAPP_NUMBER=628xxxxxxxxxx
SENTRY_DSN_API=
SENTRY_DSN_WEB=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@allobook.id
NODE_ENV=development
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
# AI & Automation
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
N8N_WEBHOOK_URL=http://localhost:5678/webhook/order-notify
N8N_WEBHOOK_SECRET=
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
```

---

## 13. Local Dev

```bash
docker-compose up -d
pnpm install
pnpm turbo dev

# Seed database (Open Library API — 40-50 buku asli)
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed

# Backfill vector embeddings
pnpm --filter api run embeddings:backfill
```

---

## 14. Urutan Kerja (Sequential — review per phase)

| # | Phase | Scope |
|---|---|---|
| 1 | Phase 1 | Root monorepo scaffold (pnpm + Turborepo + docker-compose) |
| 2 | Phase 2 | Shared packages (shared-types + config) |
| 3 | Phase 3a | Prisma schema + seed script (Open Library API) |
| 4 | Phase 3b | Fastify scaffold + auth + rate-limit + OpenAPI/Swagger |
| 5 | Phase 3c | Book, Review, Order, Wishlist, Upload, Admin Settings modules |
| 6 | Phase 3d | Meilisearch search module |
| 7 | Phase 4a | Next.js 15 scaffold + Tailwind design tokens |
| 8 | Phase 4b | Homepage, Catalog, Book Detail |
| 9 | Phase 4c | Cart, Checkout (WhatsApp), Order Confirmation |
| 10 | Phase 4d | My Account + Wishlist tab, Admin pages |
| 11 | Phase 4e | Login & Register (dari design system) |
| 12 | Phase 5 | SEO: generateMetadata, JSON-LD, sitemap, robots |
| 13 | Phase 6 | BullMQ queues (email notifikasi) |
| 14 | Phase 7 | Testing (Vitest + Playwright) |
| 15 | Phase 8 | CI/CD GitHub Actions + Sentry integration |
| 16 | Phase 9 | AI Features & Automation (Claude Haiku 4.5 summarization/routing, Claude Sonnet 4.6 chatbot reasoning, OpenAI Embeddings, pgvector, n8n) — **COMPLETED** |

### Detail Phase 9 — AI Features & RAG Chatbot
- **Intent Router**: `apps/api/src/modules/chatbot/intent-router.service.ts` memetakan pertanyaan user ke 4 intent: `book_recommendation`, `order_status`, `store_faq`, `general_parenting`.
- **Reasoning Model**: Claude Sonnet 4.6 untuk RAG Chatbot; Claude Haiku untuk intent routing, content enrichment, dan review summarization.
- **Multi-Source Retrieval**:
  - `book_recommendation`: pgvector Cosine similarity pada `books.embedding`
  - `store_faq`: pgvector HNSW index pada `faq_entries.embedding`
  - `order_status`: scoped query `orders` table dengan **MANDATORY VERIFICATION** (Order ID + WhatsApp) menghasilkan 15-menit JWT scoped token
  - `general_parenting`: direct LLM prompt dengan guardrails ketat (tanpa diagnosa medis/psikologis klinis)
- **Fallback & Handoff**: Out-of-domain query otomatis menolak secara santun dan memberikan link concierge WhatsApp (`https://wa.me/...`).
- **Frontend Chatbot**: Floating widget (bottom-right) dengan Zustand (`chat.store.ts`), SSE streaming reader, interactive inline order verification form, order summary receipt card, dan suggested books cards.

**Selalu tanya konfirmasi ke user sebelum:** mengubah desain UI, mengubah stack, atau melakukan perubahan schema database yang breaking.

---

## 15. Yang Harus Dihindari

- Jangan pakai Redux/Redux Toolkit
- Jangan pakai Create React App / Vite plain React untuk halaman publik
- Jangan taruh business logic di route handler backend
- Jangan fetch data di Client Component jika bisa di Server Component
- Jangan hardcode secret/API key di kode
- Jangan skip validasi backend hanya karena ada validasi frontend
- Jangan hardcode string label status order — gunakan ORDER_STATUS_LABELS dari shared-types
- Jangan pakai <img> biasa — selalu next/image
- Jangan commit file .env asli ke repo
