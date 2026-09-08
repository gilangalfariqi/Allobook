import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      MEILISEARCH_HOST: 'http://localhost:7700',
      MEILISEARCH_API_KEY: 'testMasterKey',
      JWT_SECRET: 'super-secret-jwt-key-min-16-chars',
      JWT_REFRESH_SECRET: 'super-refresh-jwt-key-min-16-chars',
      NODE_ENV: 'test',
    },
  },
});
