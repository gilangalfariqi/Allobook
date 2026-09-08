import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { AiRepository } from '../src/modules/ai/ai.repository';
import { EmbeddingService } from '../src/modules/ai/embedding.service';

const prisma = new PrismaClient();
const aiRepo = new AiRepository(prisma);
const embeddingService = new EmbeddingService(aiRepo);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillEmbeddings() {
  console.log('🔄 Starting backfill of embeddings for books...');
  console.log('==================================================');

  // Find all books
  const books = await prisma.book.findMany({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${books.length} total books in database.`);

  let processedCount = 0;
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const book of books) {
    // Check if embedding already exists in PostgreSQL
    const existing = await aiRepo.getBookEmbedding(book.id);
    if (existing && existing.length > 0) {
      skippedCount++;
      continue;
    }

    processedCount++;
    console.log(`[${processedCount}] Generating embedding for: "${book.title}" by ${book.author}...`);

    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        const ok = await embeddingService.generateAndSaveBookEmbedding({
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description,
          categories: book.categories.map((c) => c.category.name),
        });

        if (ok) {
          success = true;
          successCount++;
          console.log(`  ✓ Successfully saved embedding for: "${book.title}"`);
        } else {
          console.log(`  ⚠️ Embedding skipped/returned null (e.g. no OPENAI_API_KEY).`);
          break;
        }
      } catch (err: any) {
        console.error(`  ❌ Attempt ${attempts}/${maxAttempts} failed:`, err.message);
        if (attempts < maxAttempts) {
          const delay = 1000 * Math.pow(2, attempts);
          console.log(`  ⏳ Waiting ${delay}ms before retrying...`);
          await sleep(delay);
        }
      }
    }

    if (!success) {
      failedCount++;
    }

    // Rate-limiting delay between requests
    await sleep(350);
  }

  console.log('==================================================');
  console.log(`✅ Backfill process finished.`);
  console.log(`Total books: ${books.length}`);
  console.log(`Already had embedding: ${skippedCount}`);
  console.log(`Successfully generated: ${successCount}`);
  console.log(`Failed or skipped without key: ${failedCount}`);
}

backfillEmbeddings()
  .catch((err) => {
    console.error('Fatal error during backfill:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
