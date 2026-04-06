/**
 * T-08.1: ContentToSSML converter
 * Converts ContentBlock[] to SSML for Amazon Polly Neural TTS.
 * - Text blocks → paragraphs with sentence breaks
 * - Headings → emphasized with breaks before/after
 * - Code blocks → skipped (not suitable for audio)
 * - Callouts → prefixed with variant label
 * - Diagrams → skipped (visual content)
 * - Technical terms → pronunciation dictionary applied
 */

import type { ContentBlock } from '@chiselgrid/types';

/** Technical term pronunciation dictionary for AWS/engineering terms */
const PRONUNCIATION_DICTIONARY: Record<string, string> = {
  'AWS': 'A W S',
  'API': 'A P I',
  'APIs': 'A P Is',
  'CDK': 'C D K',
  'CI/CD': 'C I C D',
  'CLI': 'C L I',
  'CPU': 'C P U',
  'DNS': 'D N S',
  'DLQ': 'D L Q',
  'EC2': 'E C 2',
  'ECS': 'E C S',
  'EKS': 'E K S',
  'gRPC': 'G R P C',
  'HTML': 'H T M L',
  'HTTP': 'H T T P',
  'HTTPS': 'H T T P S',
  'IAM': 'I A M',
  'IDE': 'I D E',
  'IaC': 'Infrastructure as Code',
  'JSON': 'J son',
  'JWT': 'J W T',
  'K8s': 'Kubernetes',
  'KMS': 'K M S',
  'LLM': 'L L M',
  'LLMs': 'L L Ms',
  'MFA': 'M F A',
  'ORM': 'O R M',
  'PostgreSQL': 'Postgres Q L',
  'RAG': 'R A G',
  'REST': 'Rest',
  'RLS': 'R L S',
  'S3': 'S 3',
  'SDK': 'S D K',
  'SNS': 'S N S',
  'SQL': 'S Q L',
  'SQS': 'S Q S',
  'SRE': 'S R E',
  'SSO': 'S S O',
  'SSML': 'S S M L',
  'TLS': 'T L S',
  'TTS': 'T T S',
  'URL': 'U R L',
  'URLs': 'U R Ls',
  'UUID': 'U U I D',
  'VPC': 'V P C',
  'YAML': 'YAML',
  'async': 'a-sync',
  'npm': 'N P M',
  'pnpm': 'P N P M',
  'tsvector': 'T S vector',
  'tsx': 'T S X',
  'jsx': 'J S X',
};

export interface SSMLConversionOptions {
  /** Maximum SSML length (Polly limit is ~100,000 characters) */
  maxLength?: number;
  /** Include article title as opening */
  title?: string;
  /** Break time between sections in milliseconds */
  sectionBreakMs?: number;
}

export function contentToSSML(
  blocks: ContentBlock[],
  options: SSMLConversionOptions = {},
): string {
  const { maxLength = 95000, title, sectionBreakMs = 800 } = options;

  const parts: string[] = [];

  // Opening with title
  if (title) {
    parts.push(`<p><emphasis level="strong">${escapeSSML(applyPronunciation(title))}</emphasis></p>`);
    parts.push(`<break time="${sectionBreakMs}ms"/>`);
  }

  for (const block of blocks) {
    const ssml = blockToSSML(block, sectionBreakMs);
    if (ssml) parts.push(ssml);
  }

  let body = parts.join('\n');

  // Truncate if needed (respect Polly limits)
  if (body.length > maxLength) {
    body = body.substring(0, maxLength);
    // Find last complete tag
    const lastClose = body.lastIndexOf('</p>');
    if (lastClose > 0) {
      body = body.substring(0, lastClose + 4);
    }
  }

  return `<speak>\n${body}\n</speak>`;
}

function blockToSSML(block: ContentBlock, sectionBreakMs: number): string | null {
  switch (block.type) {
    case 'text':
      return textToSSML(block.content);

    case 'heading':
      return headingToSSML(block.content, block.level, sectionBreakMs);

    case 'code':
      // Skip code blocks — not suitable for audio narration
      return `<p><emphasis level="moderate">Code example omitted in audio version.</emphasis></p>`;

    case 'callout':
      return calloutToSSML(block.content, block.variant);

    case 'diagram':
      // Skip diagrams — visual content
      if (block.caption) {
        return `<p>Diagram: ${escapeSSML(applyPronunciation(block.caption))}</p>`;
      }
      return null;

    default:
      return null;
  }
}

function textToSSML(content: string): string {
  // Strip markdown-like syntax
  let text = content
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1');

  text = applyPronunciation(text);
  text = escapeSSML(text);

  return `<p>${text}</p>`;
}

function headingToSSML(content: string, level: number, breakMs: number): string {
  const text = escapeSSML(applyPronunciation(content));
  const emphasis = level <= 2 ? 'strong' : 'moderate';
  return `<break time="${breakMs}ms"/>\n<p><emphasis level="${emphasis}">${text}</emphasis></p>\n<break time="${Math.floor(breakMs / 2)}ms"/>`;
}

function calloutToSSML(content: string, variant: string): string {
  const labels: Record<string, string> = {
    info: 'Note',
    warning: 'Warning',
    danger: 'Important warning',
    success: 'Key takeaway',
  };
  const label = labels[variant] ?? 'Note';
  const text = escapeSSML(applyPronunciation(content));
  return `<p><emphasis level="moderate">${label}:</emphasis> ${text}</p>`;
}

function applyPronunciation(text: string): string {
  let result = text;
  for (const [term, pronunciation] of Object.entries(PRONUNCIATION_DICTIONARY)) {
    // Word boundary matching
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'g');
    result = result.replace(regex, pronunciation);
  }
  return result;
}

function escapeSSML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
