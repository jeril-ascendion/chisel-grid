import { z } from 'zod';

export const TenantPlanEnum = z.enum(['internal', 'starter', 'professional', 'enterprise']);
export type TenantPlan = z.infer<typeof TenantPlanEnum>;

export const TenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string(),
  subdomain: z.string(),
  customDomain: z.string().optional(),
  plan: TenantPlanEnum,
  createdAt: z.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;
