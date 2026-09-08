import pino from 'pino';
import { getEnv } from '../config/env';

export const logger = pino({
  level: getEnv().NODE_ENV === 'production' ? 'info' : getEnv().NODE_ENV === 'test' ? 'silent' : 'debug',
  transport:
    getEnv().NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
