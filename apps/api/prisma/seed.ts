import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Delay helper to avoid Open Library rate limits */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch with retry + exponential backoff (for Open Library rate limiting) */
async function fetchWithRetry<T>(
  url: string,
  maxRetries = 3,
  baseDelayMs = 1500
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = baseDelayMs * Math.pow(2, attempt);
        console.log(`  [Rate limit] Waiting ${wait}ms before retry ${attempt + 1}/${maxRetries}...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching: ${url}`);
      }
      return res.json() as Promise<T>;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const wait = baseDelayMs * Math.pow(2, attempt);
      console.log(`  [Error] Retrying in ${wait}ms (${attempt + 1}/${maxRetries})...`);
      await sleep(wait);
    }
  }
  throw new Error(`Failed after ${maxRetries} retries: ${url}`);
}

/** Slugify a title to a URL-safe string */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// ─── Open Library search queries ──────────────────────────────────────────────

const SEARCH_QUERIES = [
  { q: 'architecture design', limit: 10 },
  { q: 'graphic design art', limit: 10 },
  { q: 'history civilization', limit: 10 },
  { q: 'science technology future', limit: 10 },
  { q: 'fiction literature', limit: 10 },
];

interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
}

interface OpenLibraryResponse {
  docs: OpenLibraryDoc[];
}

// ─── Seed Functions ───────────────────────────────────────────────────────────

async function seedCategories() {
  console.log('\n📚 Seeding categories...');
  const categories = [
    { name: 'Architecture', slug: 'architecture' },
    { name: 'Design', slug: 'design' },
    { name: 'History', slug: 'history' },
    { name: 'Science', slug: 'science' },
    { name: 'Fiction', slug: 'fiction' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`  ✓ ${categories.length} categories seeded`);
  return await prisma.category.findMany();
}

async function seedUsers() {
  console.log('\n👤 Seeding users...');
  const adminHash = await argon2.hash('admin123');
  const userHash = await argon2.hash('user123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@allobook.id' },
    update: {},
    create: {
      email: 'admin@allobook.id',
      name: 'Admin AlloBook',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'budi@example.com' },
    update: {},
    create: {
      email: 'budi@example.com',
      name: 'Budi Santoso',
      passwordHash: userHash,
      role: Role.USER,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'sari@example.com' },
    update: {},
    create: {
      email: 'sari@example.com',
      name: 'Sari Dewi',
      passwordHash: userHash,
      role: Role.USER,
    },
  });

  console.log('  ✓ 1 admin + 2 users seeded');
  console.log('  Admin:  admin@allobook.id / admin123');
  console.log('  Users:  budi@example.com / user123');
  return { admin, user1, user2 };
}

async function seedStoreSettings() {
  console.log('\n⚙️  Seeding store settings...');
  const settings = [
    { key: 'whatsapp_number', value: '628111000000' },
    { key: 'store_name', value: 'AlloBook' },
    { key: 'store_email', value: 'hello@allobook.id' },
  ];

  for (const s of settings) {
    await prisma.storeSettings.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('  ✓ Store settings seeded');
}

async function seedBooksFromOpenLibrary(
  allCategories: Awaited<ReturnType<typeof seedCategories>>
) {
  console.log('\n📖 Fetching books from Open Library API...');
  console.log('  (Using delay between requests to respect rate limits)\n');

  const catMap = Object.fromEntries(allCategories.map((c) => [c.slug, c]));

  const seededSlugs = new Set<string>();
  let totalSeeded = 0;

  for (const { q, limit } of SEARCH_QUERIES) {
    console.log(`  Searching: "${q}" (limit ${limit})...`);

    try {
      const data = await fetchWithRetry<OpenLibraryResponse>(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=title,author_name,isbn,cover_i,first_publish_year,subject`
      );

      const docs = data.docs ?? [];
      console.log(`  Found ${docs.length} results`);

      for (const doc of docs) {
        if (!doc.title || !doc.author_name?.length) continue;

        const slug = slugify(doc.title);
        if (!slug || seededSlugs.has(slug)) continue;
        seededSlugs.add(slug);

        const isbn = doc.isbn?.[0] ?? null;
        const coverUrl = doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : null;

        const publishedAt = doc.first_publish_year
          ? new Date(`${doc.first_publish_year}-01-01`)
          : null;

        // Determine category from subject keywords
        let categorySlug = 'fiction';
        const subjects = (doc.subject ?? []).join(' ').toLowerCase();
        if (/architect/.test(subjects)) categorySlug = 'architecture';
        else if (/design|graphic|art/.test(subjects)) categorySlug = 'design';
        else if (/histor|civilization/.test(subjects)) categorySlug = 'history';
        else if (/scienc|technolog|physics|biology/.test(subjects)) categorySlug = 'science';

        const price = Number((Math.random() * (350000 - 89000) + 89000).toFixed(0));
        const stock = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * 50) + 5;
        const isPreOrder = stock === 0;

        try {
          const book = await prisma.book.upsert({
            where: { slug },
            update: {},
            create: {
              slug,
              title: doc.title,
              author: doc.author_name[0],
              isbn,
              description: `A remarkable work by ${doc.author_name[0]}. ${doc.title} is a must-read for anyone interested in expanding their knowledge and perspective.`,
              coverUrl,
              price,
              stock,
              isPreOrder,
              publishedAt,
            },
          });

          // Link to category
          const cat = catMap[categorySlug];
          if (cat) {
            await prisma.bookCategory.upsert({
              where: { bookId_categoryId: { bookId: book.id, categoryId: cat.id } },
              update: {},
              create: { bookId: book.id, categoryId: cat.id },
            });
          }

          totalSeeded++;
        } catch {
          // Skip duplicate ISBN or slug conflicts gracefully
        }

        // Small delay between DB inserts to be kind to both DB and API
        await sleep(50);
      }
    } catch (err) {
      console.error(`  ✗ Failed query "${q}":`, err);
    }

    // Delay between each search query to avoid Open Library rate limiting
    console.log(`  Waiting 2s before next query...\n`);
    await sleep(2000);
  }

  console.log(`  ✓ ${totalSeeded} books seeded from Open Library`);
}

// ─── Seed FAQ Entries ─────────────────────────────────────────────────────────

async function seedFaqEntries() {
  console.log('\n❓ Seeding FAQ knowledge base entries...');

  const faqs = [
    {
      category: 'checkout',
      question: 'Bagaimana cara melakukan Pre-Order (PO) di AlloBook?',
      answer:
        'Pilih buku berlabel Pre-Order di katalog, klik tombol "Pre-Order via WhatsApp", lengkapi formulir informasi pengiriman, lalu Anda akan diarahkan ke WhatsApp Concierge kurator kami untuk konfirmasi ketersediaan kuota dan panduan pembayaran personal.',
    },
    {
      category: 'checkout',
      question: 'Berapa lama estimasi konfirmasi dari admin setelah submit order?',
      answer:
        'Tim kurator AlloBook memproses konfirmasi setiap hari kerja pukul 08.00 - 20.00 WIB. Estimasi respons WhatsApp berkisar 15 - 30 menit pada jam operasional.',
    },
    {
      category: 'checkout',
      question: 'Apakah pembayaran pre-order harus lunas atau bisa DP (uang muka)?',
      answer:
        'Untuk judul buku impor atau edisi khusus tertentu, kami menyediakan opsi Down Payment (DP) sebesar 50%, dengan sisa pelunasan saat buku telah tiba di gudang kurator kami sebelum dikirimkan ke alamat Anda.',
    },
    {
      category: 'checkout',
      question: 'Metode pembayaran apa saja yang tersedia di AlloBook?',
      answer:
        'Kami menerima transfer bank resmi (BCA, Mandiri, BNI, BRI), QRIS untuk seluruh e-wallet (GoPay, OVO, Dana), serta Virtual Account.',
    },
    {
      category: 'checkout',
      question: 'Apakah saya bisa berbelanja tanpa mendaftar akun (Guest Checkout)?',
      answer:
        'Bisa! AlloBook mendukung penuh Guest Checkout. Anda cukup mengisi Nama, Nomor WhatsApp aktif, dan Alamat Pengiriman tanpa perlu membuat password akun.',
    },
    {
      category: 'shipping',
      question: 'Berapa lama estimasi waktu pengiriman pesanan?',
      answer:
        'Untuk buku Ready Stock, pengiriman diproses dalam 1x24 jam kerja (estimasi tiba 1-3 hari di Pulau Jawa, 3-6 hari luar Pulau Jawa). Untuk buku Pre-Order, pengiriman mengikuti jadwal terbit resmi penerbit yang tertera pada detail buku.',
    },
    {
      category: 'shipping',
      question: 'Jasa ekspedisi apa yang digunakan untuk pengiriman?',
      answer:
        'Kami bekerja sama dengan JNE, J&T Express, SiCepat, dan Paxel. Setiap buku dikemas aman dengan kardus khusus ramah lingkungan dan bubble wrap berlapis.',
    },
    {
      category: 'shipping',
      question: 'Bagaimana cara melacak nomor resi dan status paket saya?',
      answer:
        'Nomor resi otomatis dikirimkan ke WhatsApp Anda setelah status pesanan berubah menjadi SHIPPED. Anda juga dapat memantau status pesanan kapan saja melalui menu Akun Saya → Riwayat Pesanan.',
    },
    {
      category: 'shipping',
      question: 'Apakah AlloBook melayani pengiriman ke seluruh Indonesia?',
      answer:
        'Ya, kami melayani pengiriman ke seluruh kota dan kabupaten di Indonesia dengan jangkauan ekspedisi reguler maupun kilat.',
    },
    {
      category: 'return',
      question: 'Bagaimana kebijakan retur jika buku cacat cetak atau rusak saat pengiriman?',
      answer:
        'AlloBook memberikan garansi 100% penggantian buku baru atau pengembalian dana jika buku mengalami cacat cetak (halaman hilang, terbalik) atau rusak fisik dalam perjalanan ekspedisi.',
    },
    {
      category: 'return',
      question: 'Apakah wajib menyertakan video unboxing untuk mengajukan komplain?',
      answer:
        'Ya, video unboxing tanpa jeda (sejak kemasan paket masih tersegel rapi) wajib dilampirkan sebagai bukti validasi klaim asuransi ekspedisi dan penggantian unit.',
    },
    {
      category: 'return',
      question: 'Berapa batas waktu pelaporan komplain retur?',
      answer:
        'Pelaporan komplain dapat disampaikan maksimal 2x24 jam sejak status paket dinyatakan "Diterima / Delivered" oleh pihak ekspedisi.',
    },
    {
      category: 'return',
      question: 'Siapa yang menanggung biaya ongkos kirim retur barang?',
      answer:
        'Seluruh biaya ongkos kirim penggantian barang yang disebabkan cacat produk atau kesalahan kirim ditanggung sepenuhnya oleh AlloBook.',
    },
    {
      category: 'general',
      question: 'Apa arti status pesanan PENDING, PROCESSING, CONFIRMED, SHIPPED, dan DONE?',
      answer:
        'PENDING: Menunggu konfirmasi admin | PROCESSING: Pembayaran terverifikasi dan pesanan sedang disiapkan di gudang | CONFIRMED: Barang siap dikemas dan dijadwalkan pikap | SHIPPED: Paket dalam perjalanan bersama kurir | DONE: Paket telah diterima pelanggan dengan baik.',
    },
    {
      category: 'general',
      question: 'Kategori dan rentang usia buku apa saja yang tersedia di AlloBook?',
      answer:
        'AlloBook mengkurasi buku berkualitas: Balita (0-3 tahun: board book sensori & kontras), Anak Usia Dini (4-6 tahun: picture book emosi & alam), Sekolah Dasar (7-12 tahun: ensiklopedia sains & cerita fiksi), serta buku arsitektur, seni desain, sejarah, dan parenting bagi orang tua.',
    },
    {
      category: 'general',
      question: 'Apakah bisa memesan (request) buku tertentu yang belum ada di katalog?',
      answer:
        'Tentu bisa! Silakan sampaikan judul buku, nama penulis, atau foto sampul buku yang Anda cari melalui WhatsApp Concierge kami. Tim kurator akan membantu mencarikan edisi resmi yang tersedia.',
    },
    {
      category: 'general',
      question: 'Bagaimana cara menghubungi admin atau kurator AlloBook langsung?',
      answer:
        'Anda dapat menghubungi layanan WhatsApp Concierge kami di nomor yang tertera pada footer situs web, atau melalui tombol chat WhatsApp yang tersedia di setiap halaman detail buku dan menu checkout.',
    },
    {
      category: 'general',
      question: 'Mengapa buku pre-order membutuhkan waktu tunggu lebih lama?',
      answer:
        'Buku Pre-Order merupakan edisi terbitan terbatas, buku cetak ulang resmi penerbit, atau buku impor yang baru akan dikirimkan serentak setelah tanggal rilis resmi nasional/internasional.',
    },
  ];

  for (const item of faqs) {
    const existing = await prisma.faqEntry.findFirst({
      where: { question: item.question },
    });

    if (!existing) {
      await prisma.faqEntry.create({
        data: {
          question: item.question,
          answer: item.answer,
          category: item.category,
          isActive: true,
        },
      });
    }
  }

  console.log(`  ✓ ${faqs.length} FAQ entries seeded`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting AlloBook database seed...');
  console.log('='.repeat(50));

  const categories = await seedCategories();
  await seedUsers();
  await seedStoreSettings();
  await seedFaqEntries();
  await seedBooksFromOpenLibrary(categories);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
