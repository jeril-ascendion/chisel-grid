import { BUILTIN_SKILL_CONTENT } from './content';
import { parseSkill, type SkillFile } from './schema';

const cache = new Map<string, SkillFile>();

export function getBuiltinSkill(name: string): SkillFile {
  const cached = cache.get(name);
  if (cached) return cached;
  const content = BUILTIN_SKILL_CONTENT[name];
  if (!content) {
    throw new Error(`Unknown built-in skill: ${name}`);
  }
  const skill = parseSkill(content, { source: 'builtin', fallbackName: name });
  cache.set(name, skill);
  return skill;
}

export function listBuiltinSkillNames(): string[] {
  return Object.keys(BUILTIN_SKILL_CONTENT);
}
