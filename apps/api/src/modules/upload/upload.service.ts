import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getEnv } from '../../config/env';
import { BadRequestError } from '../../lib/errors';
import crypto from 'crypto';

export class UploadService {
  private s3Client: S3Client | null = null;

  constructor() {
    const env = getEnv();
    if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  async uploadFile(params: {
    buffer: Buffer;
    mimetype: string;
    originalFilename: string;
    folder: 'covers' | 'reviews';
    maxSizeBytes: number;
  }): Promise<{ url: string }> {
    const { buffer, mimetype, originalFilename, folder, maxSizeBytes } = params;
    const env = getEnv();

    // 1. Validate size
    if (buffer.length > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      throw new BadRequestError(`File exceeds maximum size of ${maxMb}MB`);
    }

    // 2. Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimetype)) {
      throw new BadRequestError('Invalid file format. Only JPG, PNG, and WebP are allowed');
    }

    // 3. Generate unique filename
    const ext = mimetype.split('/')[1] === 'jpeg' ? 'jpg' : mimetype.split('/')[1];
    const uniqueKey = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    // 4. Upload to Cloudflare R2 if configured, or mock public URL for local dev
    if (this.s3Client && env.R2_BUCKET_NAME) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: uniqueKey,
          Body: buffer,
          ContentType: mimetype,
        })
      );

      const publicBase = env.R2_PUBLIC_URL?.replace(/\/$/, '') ?? 'https://pub.allobook.id';
      return { url: `${publicBase}/${uniqueKey}` };
    }

    // In local dev without live R2 credentials, return placeholder / simulated R2 URL
    const publicBase = env.R2_PUBLIC_URL?.replace(/\/$/, '') || 'https://assets.allobook.id';
    return { url: `${publicBase}/${uniqueKey}` };
  }
}
