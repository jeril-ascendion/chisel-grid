/**
 * T-09.7: Migration validation
 * Crawls all migrated URLs, verifies HTTP 200, checks content renders.
 */

import type { ValidationResult } from './types.js';

export interface ValidatorOptions {
  /** Base URL of the deployed site */
  baseUrl: string;
  /** Slugs to validate */
  slugs: string[];
  /** Concurrent request limit */
  concurrency?: number;
  /** Request timeout in ms */
  timeoutMs?: number;
}

export async function validateMigration(options: ValidatorOptions): Promise<ValidationResult[]> {
  const { baseUrl, slugs, concurrency = 5, timeoutMs = 10000 } = options;

  console.log(`Validating ${slugs.length} migrated URLs against ${baseUrl}`);

  const results: ValidationResult[] = [];

  // Process in batches for concurrency control
  for (let i = 0; i < slugs.length; i += concurrency) {
    const batch = slugs.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map((slug) => validateUrl(`${baseUrl}/articles/${slug}`, timeoutMs)),
    );

    results.push(...batchResults);

    if ((i + concurrency) % 50 === 0) {
      const ok = results.filter((r) => r.status === 200).length;
      console.log(`  Progress: ${results.length}/${slugs.length} checked (${ok} OK)`);
    }
  }

  // Summary
  const ok = results.filter((r) => r.status === 200 && r.contentRendered);
  const notFound = results.filter((r) => r.status === 404);
  const errors = results.filter((r) => r.error);

  console.log(`\nValidation complete:`);
  console.log(`  OK: ${ok.length}/${results.length}`);
  console.log(`  404: ${notFound.length}`);
  console.log(`  Errors: ${errors.length}`);

  if (notFound.length > 0) {
    console.error('\n404 URLs:');
    for (const r of notFound) {
      console.error(`  ${r.url}`);
    }
  }

  return results;
}

async function validateUrl(url: string, timeoutMs: number): Promise<ValidationResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timer);

    const body = await res.text();

    // Check that content actually rendered (not just a 200 shell)
    const contentRendered =
      res.status === 200 &&
      body.length > 500 &&
      (body.includes('article') || body.includes('prose'));

    return {
      url,
      status: res.status,
      contentRendered,
    };
  } catch (err) {
    return {
      url,
      status: 0,
      contentRendered: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// CLI entry point
if (process.argv[1]?.endsWith('validator.ts') || process.argv[1]?.endsWith('validator.js')) {
  const baseUrl = process.argv[2];
  const slugsFile = process.argv[3];
  if (!baseUrl) {
    console.error('Usage: tsx src/validator.ts <base-url> [slugs-file]');
    process.exit(1);
  }
  // Read slugs from file or stdin
  const slugs = slugsFile
    ? require('fs').readFileSync(slugsFile, 'utf-8').split('\n').filter(Boolean)
    : [];

  validateMigration({ baseUrl, slugs }).catch((err) => {
    console.error('Validation failed:', err);
    process.exit(1);
  });
}
