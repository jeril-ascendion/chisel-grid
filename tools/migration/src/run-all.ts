/**
 * Migration runner — orchestrates the full migration pipeline.
 * Usage: tsx src/run-all.ts <source-dir> [--dry-run] [--validate <base-url>]
 */

import { writeFileSync } from 'node:fs';
import { crawlStaticSite } from './crawler.js';
import { convertFiles } from './converter.js';
import { importMermaidFiles } from './mermaid-importer.js';
import { buildSlugMappings, generateCloudFrontRedirects } from './slug-mapper.js';
import { bulkImport } from './bulk-importer.js';
import { validateMigration } from './validator.js';

async function main() {
  const args = process.argv.slice(2);
  const sourceDir = args[0];
  const dryRun = args.includes('--dry-run');
  const validateIdx = args.indexOf('--validate');
  const validateUrl = validateIdx >= 0 ? args[validateIdx + 1] : undefined;

  if (!sourceDir) {
    console.error('Usage: tsx src/run-all.ts <source-dir> [--dry-run] [--validate <base-url>]');
    process.exit(1);
  }

  console.log('=== ChiselGrid Content Migration ===');
  console.log(`Source: ${sourceDir}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  // Step 1: Crawl
  console.log('--- Step 1: Crawling source files ---');
  const files = await crawlStaticSite({ sourceDir });

  // Step 2: Convert MD/HTML files
  console.log('\n--- Step 2: Converting content ---');
  const converted = await convertFiles(
    files.filter((f) => f.fileType !== 'mmd'),
  );

  // Step 3: Import Mermaid diagrams
  console.log('\n--- Step 3: Importing Mermaid diagrams ---');
  const mermaidContent = importMermaidFiles(files);
  const allContent = [...converted, ...mermaidContent];

  // Step 4: Build slug mappings
  console.log('\n--- Step 4: Building slug mappings ---');
  const mappings = buildSlugMappings(allContent);
  const redirectsNeeded = mappings.filter((m) => m.redirectNeeded);
  console.log(`  Total mappings: ${mappings.length}`);
  console.log(`  Redirects needed: ${redirectsNeeded.length}`);

  // Step 5: Generate CloudFront redirects
  console.log('\n--- Step 5: Generating CloudFront redirects ---');
  const redirectCode = generateCloudFrontRedirects(mappings);
  const outputPath = 'output/cloudfront-redirects.js';
  writeFileSync(outputPath, redirectCode);
  console.log(`  Written to: ${outputPath}`);

  // Step 6: Bulk import
  console.log('\n--- Step 6: Bulk importing to database ---');
  const result = await bulkImport(allContent, {
    tenantId: process.env.TENANT_ID ?? 'default-tenant',
    authorId: process.env.AUTHOR_ID ?? 'migration-bot',
    dryRun,
  });

  // Step 7: Generate slug list for validation
  const slugList = allContent.map((c) => c.slug);
  writeFileSync('output/migrated-slugs.txt', slugList.join('\n'));
  console.log(`\nSlug list written to: output/migrated-slugs.txt`);

  // Step 8: Validate (if URL provided)
  if (validateUrl) {
    console.log('\n--- Step 7: Validating migrated content ---');
    await validateMigration({
      baseUrl: validateUrl,
      slugs: slugList,
    });
  }

  // Summary
  console.log('\n=== Migration Summary ===');
  console.log(`  Files crawled: ${files.length}`);
  console.log(`  Content converted: ${allContent.length}`);
  console.log(`  Imported: ${result.imported}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Redirects: ${redirectsNeeded.length}`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
