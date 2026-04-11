import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/*.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  tablesFilter: ['studio_*'],
} satisfies Config;
