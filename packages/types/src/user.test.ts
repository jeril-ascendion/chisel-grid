import { describe, it, expect } from 'vitest';
import { UserRoleEnum, UserSchema } from './user';

describe('UserRoleEnum', () => {
  it('accepts valid roles', () => {
    expect(UserRoleEnum.parse('admin')).toBe('admin');
    expect(UserRoleEnum.parse('creator')).toBe('creator');
    expect(UserRoleEnum.parse('reader')).toBe('reader');
  });

  it('rejects invalid roles', () => {
    expect(() => UserRoleEnum.parse('superadmin')).toThrow();
  });
});

describe('UserSchema', () => {
  const validUser = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin' as const,
    cognitoSub: 'sub-12345',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('validates a complete user', () => {
    expect(UserSchema.parse(validUser)).toBeTruthy();
  });

  it('rejects non-uuid userId', () => {
    expect(() => UserSchema.parse({ ...validUser, userId: 'not-a-uuid' })).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => UserSchema.parse({ ...validUser, email: 'not-email' })).toThrow();
  });
});
