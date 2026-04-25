import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SkillFile {
  name: string;
  version: string;
  description: string;
  domain: string;
  rules: string[];
  examples: string[];
  constraints: string[];
  rawBody: string;
  source: 'builtin' | 'tenant';
}

export interface SkillFrontmatter {
  name?: string;
  version?: string;
  description?: string;
  domain?: string;
}

const FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/;

function parseFrontmatter(raw: string): { meta: SkillFrontmatter; body: string } {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    return { meta: {}, body: raw };
  }
  const yaml = match[1] ?? '';
  const body = match[2] ?? '';
  const meta: SkillFrontmatter = {};
  for (const line of yaml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === 'name' || key === 'version' || key === 'description' || key === 'domain') {
      meta[key] = value;
    }
  }
  return { meta, body };
}

interface SectionLists {
  rules: string[];
  examples: string[];
  constraints: string[];
}

function parseSections(body: string): SectionLists {
  const lines = body.split(/\r?\n/);
  const rules: string[] = [];
  const examples: string[] = [];
  const constraints: string[] = [];

  let current: 'rules' | 'examples' | 'constraints' | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current && buffer.length > 0) {
      const target =
        current === 'rules' ? rules : current === 'examples' ? examples : constraints;
      const items = buffer
        .join('\n')
        .split(/\n(?=- )/)
        .map((s) => s.replace(/^-\s+/, '').trim())
        .filter((s) => s.length > 0);
      target.push(...items);
    }
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      const title = heading[1]!.toLowerCase();
      if (title.startsWith('rules')) current = 'rules';
      else if (title.startsWith('examples')) current = 'examples';
      else if (title.startsWith('constraints')) current = 'constraints';
      else current = null;
      continue;
    }
    if (current && line.trim().length > 0) {
      buffer.push(line);
    } else if (current && line.trim().length === 0 && buffer.length > 0) {
      buffer.push('');
    }
  }
  flush();

  return { rules, examples, constraints };
}

export function parseSkill(
  content: string,
  opts: { source?: 'builtin' | 'tenant'; fallbackName?: string } = {},
): SkillFile {
  const { meta, body } = parseFrontmatter(content);
  const sections = parseSections(body);
  const name = meta.name ?? opts.fallbackName ?? 'unnamed';
  if (!meta.name && !opts.fallbackName) {
    throw new Error('parseSkill: missing required frontmatter "name"');
  }
  return {
    name,
    version: meta.version ?? '0.0.0',
    description: meta.description ?? '',
    domain: meta.domain ?? 'general',
    rules: sections.rules,
    examples: sections.examples,
    constraints: sections.constraints,
    rawBody: body.trim(),
    source: opts.source ?? 'builtin',
  };
}

const here = dirname(fileURLToPath(import.meta.url));

export function loadSkill(skillPath: string): SkillFile {
  const abs = isAbsolute(skillPath) ? skillPath : resolve(here, skillPath);
  const content = readFileSync(abs, 'utf8');
  return parseSkill(content, { source: 'builtin' });
}

export interface AssembleOptions {
  preludePath?: string;
  schemaBlock?: string;
}

export function assemblePrompt(
  basePrompt: string,
  skills: SkillFile[],
  opts: AssembleOptions = {},
): string {
  const seen = new Set<string>();
  const ordered = skills.filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  const parts: string[] = [];
  parts.push(basePrompt.trim());
  parts.push('');

  for (const skill of ordered) {
    parts.push(
      `# Skill: ${skill.name}@${skill.version}` +
        (skill.source === 'tenant' ? ' (tenant override)' : ''),
    );
    if (skill.description) parts.push(skill.description);
    if (skill.rules.length > 0) {
      parts.push('');
      parts.push('## Rules');
      for (const rule of skill.rules) parts.push(`- ${rule}`);
    }
    if (skill.constraints.length > 0) {
      parts.push('');
      parts.push('## Constraints');
      for (const c of skill.constraints) parts.push(`- ${c}`);
    }
    if (skill.examples.length > 0) {
      parts.push('');
      parts.push('## Examples');
      for (const ex of skill.examples) parts.push(`- ${ex}`);
    }
    parts.push('');
  }

  if (opts.schemaBlock) {
    parts.push(opts.schemaBlock.trim());
    parts.push('');
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function estimateTokens(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}
