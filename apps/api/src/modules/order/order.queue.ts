import { Queue, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { getEnv } from '../../config/env';
import { logger } from '../../lib/logger';

export const ORDER_QUEUE_NAME = 'order-notification';

let orderQueue: Queue | null = null;
let orderWorker: Worker | null = null;

export function initOrderQueue(redisConnection: any) {
  const env = getEnv();

  try {
    orderQueue = new Queue(ORDER_QUEUE_NAME, {
      connection: redisConnection,
    });

    const transporter =
      env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
        ? nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT || 587,
            auth: {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            },
          })
        : null;

    orderWorker = new Worker(
      ORDER_QUEUE_NAME,
      async (job) => {
        const { order, type } = job.data;
        logger.info({ orderId: order.id, type }, 'Processing order notification email');

        if (!order.customerEmail) {
          logger.info({ orderId: order.id }, 'Skipping email: no email address provided');
          return;
        }

        const subject =
          type === 'STATUS_UPDATE'
            ? `Update Status Pesanan #${order.id} — AlloBook`
            : `Konfirmasi Pre-Order #${order.id} — AlloBook`;

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1c1b;">
            <h2 style="color: #0f2e2a;">Halo, ${order.customerName}!</h2>
            <p>Terima kasih telah berbelanja di AlloBook. Berikut rincian pesanan Anda:</p>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Total:</strong> Rp ${Number(order.totalAmount).toLocaleString('id-ID')}</p>
            <p style="margin-top: 24px; font-size: 12px; color: #717977;">
              Pesan ini dikirim otomatis oleh sistem AlloBook.
            </p>
          </div>
        `;

        if (transporter) {
          await transporter.sendMail({
            from: env.EMAIL_FROM || 'noreply@allobook.id',
            to: order.customerEmail,
            subject,
            html,
          });
          logger.info({ orderId: order.id }, 'Notification email sent successfully');
        } else {
          logger.info(
            { orderId: order.id, to: order.customerEmail },
            'SMTP not configured; simulated email sent'
          );
        }
      },
      { connection: redisConnection }
    );

    orderWorker.on('error', (err) => {
      logger.warn({ err }, 'Order worker error');
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to initialize BullMQ order queue');
  }
}

export async function queueOrderNotification(order: any, type: 'CREATED' | 'STATUS_UPDATE') {
  if (!orderQueue) return;
  try {
    await orderQueue.add('send-notification', { order, type });
  } catch (err) {
    logger.warn({ err }, 'Failed to add job to order queue');
  }
}
