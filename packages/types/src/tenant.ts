import { z } from 'zod';

export const TenantPlanEnum = z.enum(['internal', 'starter', 'professional', 'enterprise']);
export type TenantPlan = z.infer<typeof TenantPlanEnum>;

export const TenantBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2563EB'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#7C3AED'),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#F59E0B'),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FFFFFF'),
  surfaceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#F8FAFC'),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0F172A'),
  textSecondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#64748B'),
  borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#E2E8F0'),
  darkPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3B82F6'),
  darkBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0F172A'),
  darkSurfaceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#1E293B'),
  darkTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#F1F5F9'),
  darkBorderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#334155'),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  fontFamily: z.string().default('Inter, system-ui, sans-serif'),
  headingFontFamily: z.string().default('Inter, system-ui, sans-serif'),
  borderRadius: z.string().default('0.5rem'),
});

export type TenantBranding = z.infer<typeof TenantBrandingSchema>;

export const TenantFeatureFlagsSchema = z.object({
  aiContentGeneration: z.boolean().default(true),
  audioNarration: z.boolean().default(true),
  customDomain: z.boolean().default(false),
  ssoIntegration: z.boolean().default(false),
  apiAccess: z.boolean().default(false),
  advancedAnalytics: z.boolean().default(false),
  whiteLabel: z.boolean().default(false),
  maxContentItems: z.number().int().positive().default(100),
  maxUsersCount: z.number().int().positive().default(10),
  maxAiTokensPerMonth: z.number().int().positive().default(500_000),
  maxStorageMb: z.number().int().positive().default(1_000),
});

export type TenantFeatureFlags = z.infer<typeof TenantFeatureFlagsSchema>;

export const TenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string(),
  subdomain: z.string(),
  customDomain: z.string().optional(),
  plan: TenantPlanEnum,
  branding: TenantBrandingSchema.optional(),
  featureFlags: TenantFeatureFlagsSchema.optional(),
  createdAt: z.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;

/** Default branding values keyed by plan */
export const DEFAULT_BRANDING: Record<TenantPlan, Partial<TenantBranding>> = {
  internal: {},
  starter: {},
  professional: {},
  enterprise: {},
};

/** Default feature flags keyed by plan */
export const PLAN_FEATURE_FLAGS: Record<TenantPlan, TenantFeatureFlags> = {
  internal: {
    aiContentGeneration: true,
    audioNarration: true,
    customDomain: true,
    ssoIntegration: true,
    apiAccess: true,
    advancedAnalytics: true,
    whiteLabel: true,
    maxContentItems: 999_999,
    maxUsersCount: 999_999,
    maxAiTokensPerMonth: 999_999_999,
    maxStorageMb: 999_999,
  },
  starter: {
    aiContentGeneration: true,
    audioNarration: false,
    customDomain: false,
    ssoIntegration: false,
    apiAccess: false,
    advancedAnalytics: false,
    whiteLabel: false,
    maxContentItems: 100,
    maxUsersCount: 5,
    maxAiTokensPerMonth: 500_000,
    maxStorageMb: 1_000,
  },
  professional: {
    aiContentGeneration: true,
    audioNarration: true,
    customDomain: true,
    ssoIntegration: false,
    apiAccess: true,
    advancedAnalytics: true,
    whiteLabel: false,
    maxContentItems: 1_000,
    maxUsersCount: 25,
    maxAiTokensPerMonth: 5_000_000,
    maxStorageMb: 10_000,
  },
  enterprise: {
    aiContentGeneration: true,
    audioNarration: true,
    customDomain: true,
    ssoIntegration: true,
    apiAccess: true,
    advancedAnalytics: true,
    whiteLabel: true,
    maxContentItems: 999_999,
    maxUsersCount: 999_999,
    maxAiTokensPerMonth: 999_999_999,
    maxStorageMb: 999_999,
  },
};
