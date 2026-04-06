/**
 * T-09.1: Static site crawler
 * Reads existing HTML/MD/MMD files from a local directory (cloned GitHub repo).
 * Extracts content structure, frontmatter, and body.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import type { CrawledFile } from './types.js';

export interface CrawlerOptions {
  /** Root directory of the static site (cloned repo) */
  sourceDir: string;
  /** File extensions to process */
  extensions?: string[];
  /** Directories to skip */
  excludeDirs?: string[];
}

export async function crawlStaticSite(options: CrawlerOptions): Promise<CrawledFile[]> {
  const {
    sourceDir,
    extensions = ['.html', '.md', '.mmd'],
    excludeDirs = ['node_modules', '.git', '_site', 'dist', 'build'],
  } = options;

  if (!existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  const patterns = extensions.map((ext) => `**/*${ext}`);
  const ignorePatterns = excludeDirs.map((dir) => `**/${dir}/**`);

  const files: CrawledFile[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: sourceDir,
      ignore: ignorePatterns,
      nodir: true,
    });

    for (const match of matches) {
      const filePath = join(sourceDir, match);
      const rawContent = readFileSync(filePath, 'utf-8');
      const ext = extname(match).toLowerCase();

      let fileType: CrawledFile['fileType'];
      let frontmatter: Record<string, unknown> = {};
      let body: string;

      if (ext === '.html') {
        fileType = 'html';
        body = rawContent;
      } else if (ext === '.md') {
        fileType = 'md';
        const parsed = matter(rawContent);
        frontmatter = parsed.data as Record<string, unknown>;
        body = parsed.content;
      } else if (ext === '.mmd') {
        fileType = 'mmd';
        body = rawContent;
      } else {
        continue;
      }

      files.push({
        sourcePath: relative(sourceDir, filePath),
        fileType,
        rawContent,
        frontmatter,
        body,
      });
    }
  }

  console.log(`Crawled ${files.length} files from ${sourceDir}`);
  console.log(
    `  HTML: ${files.filter((f) => f.fileType === 'html').length}`,
    `  MD: ${files.filter((f) => f.fileType === 'md').length}`,
    `  MMD: ${files.filter((f) => f.fileType === 'mmd').length}`,
  );

  return files;
}

// CLI entry point
if (process.argv[1]?.endsWith('crawler.ts') || process.argv[1]?.endsWith('crawler.js')) {
  const sourceDir = process.argv[2];
  if (!sourceDir) {
    console.error('Usage: tsx src/crawler.ts <source-directory>');
    process.exit(1);
  }
  crawlStaticSite({ sourceDir })
    .then((files) => {
      console.log(`\nCrawled files:`);
      for (const f of files) {
        console.log(`  [${f.fileType}] ${f.sourcePath}`);
      }
    })
    .catch((err) => {
      console.error('Crawl failed:', err);
      process.exit(1);
    });
}
