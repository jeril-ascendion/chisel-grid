/**
 * Lambda@Edge Origin Response handler for tenant branding injection.
 * Runs at CloudFront edge to inject tenant-specific CSS custom properties
 * into HTML responses via a <style> tag in the <head>.
 *
 * Reads x-tenant-config header set by the tenant-router origin-request function.
 */

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = process.env['TENANT_BRANDING_TABLE'] || 'chiselgrid-tenant-pools-dev';

// Branding cache per tenant
const brandingCache = new Map<string, { css: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  darkPrimaryColor: string;
  darkBackgroundColor: string;
  darkSurfaceColor: string;
  darkTextColor: string;
  darkBorderColor: string;
  logoUrl: string;
  faviconUrl: string;
  fontFamily: string;
  headingFontFamily: string;
  borderRadius: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#2563EB',
  secondaryColor: '#7C3AED',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  surfaceColor: '#F8FAFC',
  textColor: '#0F172A',
  textSecondaryColor: '#64748B',
  borderColor: '#E2E8F0',
  darkPrimaryColor: '#3B82F6',
  darkBackgroundColor: '#0F172A',
  darkSurfaceColor: '#1E293B',
  darkTextColor: '#F1F5F9',
  darkBorderColor: '#334155',
  logoUrl: '',
  faviconUrl: '',
  fontFamily: 'Inter, system-ui, sans-serif',
  headingFontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: '0.5rem',
};

function brandingToCss(branding: BrandingConfig): string {
  return `:root {
  --tenant-primary: ${branding.primaryColor};
  --tenant-secondary: ${branding.secondaryColor};
  --tenant-accent: ${branding.accentColor};
  --tenant-bg: ${branding.backgroundColor};
  --tenant-surface: ${branding.surfaceColor};
  --tenant-text: ${branding.textColor};
  --tenant-text-secondary: ${branding.textSecondaryColor};
  --tenant-border: ${branding.borderColor};
  --tenant-font: ${branding.fontFamily};
  --tenant-heading-font: ${branding.headingFontFamily};
  --tenant-radius: ${branding.borderRadius};
}
[data-theme="dark"] {
  --tenant-primary: ${branding.darkPrimaryColor};
  --tenant-bg: ${branding.darkBackgroundColor};
  --tenant-surface: ${branding.darkSurfaceColor};
  --tenant-text: ${branding.darkTextColor};
  --tenant-border: ${branding.darkBorderColor};
}`;
}

async function getTenantBrandingCss(subdomain: string): Promise<string> {
  const cached = brandingCache.get(subdomain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.css;
  }

  try {
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { subdomain: { S: subdomain } },
      ProjectionExpression: 'branding',
    }));

    let branding = DEFAULT_BRANDING;
    if (result.Item?.['branding']?.S) {
      const parsed = JSON.parse(result.Item['branding'].S);
      branding = { ...DEFAULT_BRANDING, ...parsed };
    }

    const css = brandingToCss(branding);
    brandingCache.set(subdomain, { css, expiresAt: Date.now() + CACHE_TTL_MS });
    return css;
  } catch {
    return brandingToCss(DEFAULT_BRANDING);
  }
}

interface CloudFrontResponse {
  status: string;
  statusDescription: string;
  headers: Record<string, Array<{ key: string; value: string }>>;
  body?: string;
  bodyEncoding?: string;
}

interface CloudFrontResponseEvent {
  Records: Array<{
    cf: {
      request: {
        headers: Record<string, Array<{ key: string; value: string }>>;
      };
      response: CloudFrontResponse;
    };
  }>;
}

export async function handler(event: CloudFrontResponseEvent): Promise<CloudFrontResponse> {
  const response = event.Records[0]!.cf.response;
  const request = event.Records[0]!.cf.request;

  // Only inject into HTML responses
  const contentType = response.headers['content-type']?.[0]?.value || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Get tenant config from request headers (set by tenant-router)
  const tenantConfigHeader = request.headers['x-tenant-config']?.[0]?.value;
  if (!tenantConfigHeader) {
    return response;
  }

  let tenantConfig: { subdomain: string; tenantName: string };
  try {
    tenantConfig = JSON.parse(tenantConfigHeader);
  } catch {
    return response;
  }

  const css = await getTenantBrandingCss(tenantConfig.subdomain);
  const styleTag = `<style id="tenant-branding">${css}</style>`;

  // Inject CSS into the <head> of the HTML
  if (response.body) {
    response.body = response.body.replace('</head>', `${styleTag}</head>`);
  }

  return response;
}
