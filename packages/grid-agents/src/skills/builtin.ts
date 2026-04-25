import { loadSkill, type SkillFile } from './schema';

const BUILTIN_FILES: Record<string, string> = {
  base: 'base.skill.md',
  'aws-well-architected': 'aws-well-architected.skill.md',
  serverless: 'serverless.skill.md',
  'payment-systems': 'payment-systems.skill.md',
  'bsp-afasa': 'bsp-afasa.skill.md',
  'pci-dss-v4': 'pci-dss-v4.skill.md',
  positions: 'positions.skill.md',
};

const cache = new Map<string, SkillFile>();

export function getBuiltinSkill(name: string): SkillFile {
  const cached = cache.get(name);
  if (cached) return cached;
  const file = BUILTIN_FILES[name];
  if (!file) {
    throw new Error(`Unknown built-in skill: ${name}`);
  }
  const skill = loadSkill(file);
  cache.set(name, skill);
  return skill;
}

export function listBuiltinSkillNames(): string[] {
  return Object.keys(BUILTIN_FILES);
}
