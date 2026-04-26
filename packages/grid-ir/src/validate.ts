import { GridIRSchema } from './schema';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGridIR(json: unknown): ValidationResult {
  const result = GridIRSchema.safeParse(json);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  return { valid: false, errors };
}
