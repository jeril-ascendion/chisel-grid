import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/ai',
  'packages/db',
  'packages/types',
  'apps/api',
]);
