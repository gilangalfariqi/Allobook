import * as Sentry from '@sentry/node';
import { getEnv } from '../config/env';
import { logger } from './logger';

export function initSentry() {
  const env = getEnv();
  if (env.SENTRY_DSN_API) {
    Sentry.init({
      dsn: env.SENTRY_DSN_API,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
    logger.info('📡 Sentry error monitoring initialized for API');
  }
}

export { Sentry };
