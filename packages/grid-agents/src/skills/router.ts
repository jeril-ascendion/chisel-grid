import { getBuiltinSkill } from './builtin';
import type { SkillFile } from './schema';

const PAYMENT_PATTERNS = [
  /\bpayment[s]?\b/i,
  /\bbank(ing)?\b/i,
  /\bfintech\b/i,
  /\bremittance\b/i,
  /\bcard(holder)?\b/i,
  /\bpci(-dss)?\b/i,
  /\bfinancial\b/i,
  /\binstapay\b/i,
];

const PHILIPPINES_PATTERNS = [
  /\bphilippine[s]?\b/i,
  /\bbsp\b/i,
  /\bunion bank\b/i,
  /\bbdo\b/i,
  /\bbpi\b/i,
  /\bmetrobank\b/i,
  /\bland bank\b/i,
  /\brcbc\b/i,
  /\bsecurity bank\b/i,
  /\bchina bank\b/i,
  /\binstapay\b/i,
  /\bafasa\b/i,
];

const SERVERLESS_PATTERNS = [
  /\blambda\b/i,
  /\bserverless\b/i,
  /\bapi gateway\b/i,
  /\bstep function[s]?\b/i,
  /\beventbridge\b/i,
];

const PCI_PATTERNS = [/\bpci(-dss)?\b/i, /\bcardholder\b/i, /\bcde\b/i, /\bv4\.0\b/i];

const AWS_PATTERNS = [/\baws\b/i, /\bcloudfront\b/i, /\baurora\b/i, /\bs3\b/i];

const AWS_DIAGRAM_TYPES = new Set(['aws_architecture']);

function any(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export interface SelectSkillsOptions {
  prompt: string;
  diagramType: string;
  context?: string;
}

export function selectSkills(prompt: string, diagramType: string): string[] {
  return selectSkillsFor({ prompt, diagramType });
}

export function selectSkillsFor(opts: SelectSkillsOptions): string[] {
  const haystack = [opts.prompt, opts.context ?? '', opts.diagramType].join(' ');
  const selected = new Set<string>(['base', 'positions']);

  const isPayment = any(haystack, PAYMENT_PATTERNS);
  const isPhilippines = any(haystack, PHILIPPINES_PATTERNS);
  const isServerless = any(haystack, SERVERLESS_PATTERNS);
  const isPci = any(haystack, PCI_PATTERNS);
  const isAws = any(haystack, AWS_PATTERNS) || AWS_DIAGRAM_TYPES.has(opts.diagramType);

  if (isAws) selected.add('aws-well-architected');
  if (isServerless) selected.add('serverless');
  if (isPayment) {
    selected.add('payment-systems');
    selected.add('aws-well-architected');
  }
  if (isPhilippines && isPayment) selected.add('bsp-afasa');
  if (isPci || isPayment) selected.add('pci-dss-v4');

  return [
    'base',
    'aws-well-architected',
    'serverless',
    'payment-systems',
    'pci-dss-v4',
    'bsp-afasa',
    'positions',
  ].filter((n) => selected.has(n));
}

export function loadSelectedSkills(names: string[]): SkillFile[] {
  return names.map((n) => getBuiltinSkill(n));
}

export function mergeWithTenantSkills(
  builtinNames: string[],
  tenantSkills: SkillFile[],
): SkillFile[] {
  const overrideByName = new Map<string, SkillFile>();
  for (const s of tenantSkills) overrideByName.set(s.name, { ...s, source: 'tenant' });

  const merged: SkillFile[] = [];
  const seen = new Set<string>();

  for (const name of builtinNames) {
    if (overrideByName.has(name)) {
      merged.push(overrideByName.get(name)!);
    } else {
      merged.push(getBuiltinSkill(name));
    }
    seen.add(name);
  }

  for (const skill of tenantSkills) {
    if (!seen.has(skill.name)) {
      merged.push({ ...skill, source: 'tenant' });
      seen.add(skill.name);
    }
  }

  return merged;
}
