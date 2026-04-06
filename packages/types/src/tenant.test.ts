import { describe, it, expect } from 'vitest';
import { TenantPlanEnum, TenantSchema } from './tenant';

describe('TenantPlanEnum', () => {
  it('accepts valid plans', () => {
    for (const plan of ['internal', 'starter', 'professional', 'enterprise'] as const) {
      expect(TenantPlanEnum.parse(plan)).toBe(plan);
    }
  });

  it('rejects invalid plans', () => {
    expect(() => TenantPlanEnum.parse('free')).toThrow();
  });
});

describe('TenantSchema', () => {
  it('validates a complete tenant', () => {
    const tenant = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Ascendion',
      subdomain: 'ascendion',
      plan: 'internal' as const,
      createdAt: new Date(),
    };
    expect(TenantSchema.parse(tenant)).toBeTruthy();
  });

  it('accepts optional customDomain', () => {
    const tenant = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test',
      subdomain: 'test',
      customDomain: 'blog.test.com',
      plan: 'professional' as const,
      createdAt: new Date(),
    };
    expect(TenantSchema.parse(tenant).customDomain).toBe('blog.test.com');
  });
});
