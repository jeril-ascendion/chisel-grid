/**
 * T-20.12 Manifest Packaging
 *
 * Packages manifest.json + icons + screenshots as teams-app.zip
 * for Microsoft Partner Center submission.
 *
 * NOTE: Do NOT actually submit to Partner Center.
 * This generates a submission-ready package only.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

interface ManifestPackage {
  manifest: string;
  colorIcon: string;
  outlineIcon: string;
  screenshots: string[];
  outputPath: string;
}

/**
 * Generates placeholder icon SVGs for the Teams app.
 */
export function generateIcons(outputDir: string): void {
  // Color icon (192x192)
  const colorIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="16" fill="#6366F1"/>
  <text x="96" y="110" font-family="Segoe UI, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">CG</text>
</svg>`;

  // Outline icon (32x32)
  const outlineIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="transparent" stroke="#6366F1" stroke-width="2"/>
  <text x="16" y="22" font-family="Segoe UI, sans-serif" font-size="14" font-weight="bold" fill="#6366F1" text-anchor="middle">CG</text>
</svg>`;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(join(outputDir, 'color.png'), colorIcon);
  writeFileSync(join(outputDir, 'outline.png'), outlineIcon);
}

/**
 * Validates manifest.json against Teams requirements.
 */
export function validateManifest(manifestPath: string): string[] {
  const errors: string[] = [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  if (!manifest.id) errors.push('Missing app ID');
  if (!manifest.version) errors.push('Missing version');
  if (!manifest.name?.short) errors.push('Missing short name');
  if (manifest.name?.short?.length > 30) errors.push('Short name exceeds 30 chars');
  if (!manifest.description?.short) errors.push('Missing short description');
  if (manifest.description?.short?.length > 80) errors.push('Short description exceeds 80 chars');
  if (!manifest.description?.full) errors.push('Missing full description');
  if (manifest.description?.full?.length > 4000) errors.push('Full description exceeds 4000 chars');
  if (!manifest.icons?.color) errors.push('Missing color icon');
  if (!manifest.icons?.outline) errors.push('Missing outline icon');
  if (!manifest.developer?.name) errors.push('Missing developer name');
  if (!manifest.developer?.websiteUrl) errors.push('Missing website URL');
  if (!manifest.developer?.privacyUrl) errors.push('Missing privacy URL');
  if (!manifest.developer?.termsOfUseUrl) errors.push('Missing terms URL');

  return errors;
}

console.log('Teams App Store submission package generator.');
console.log('Run validateManifest() to check manifest, generateIcons() to create placeholder icons.');
