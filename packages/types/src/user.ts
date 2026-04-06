import { z } from 'zod';

export const UserRoleEnum = z.enum(['admin', 'creator', 'reader']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const UserSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleEnum,
  cognitoSub: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
