'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
  headingFontFamily: string;
  borderRadius: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export interface TenantConfig {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  plan: string;
  branding: TenantBranding;
}

const defaultBranding: TenantBranding = {
  primaryColor: '#2563EB',
  secondaryColor: '#7C3AED',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  surfaceColor: '#F8FAFC',
  textColor: '#0F172A',
  fontFamily: 'Inter, system-ui, sans-serif',
  headingFontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: '0.5rem',
};

const defaultTenantConfig: TenantConfig = {
  tenantId: 'default',
  tenantName: 'ChiselGrid',
  subdomain: '',
  plan: 'internal',
  branding: defaultBranding,
};

const TenantContext = createContext<TenantConfig>(defaultTenantConfig);

export function useTenant(): TenantConfig {
  return useContext(TenantContext);
}

export function useTenantBranding(): TenantBranding {
  return useContext(TenantContext).branding;
}

interface TenantBrandingProviderProps {
  children: ReactNode;
  initialConfig?: Partial<TenantConfig>;
}

/**
 * Provides tenant branding context to the application.
 * Reads branding from:
 * 1. Server-injected CSS custom properties (from Lambda@Edge)
 * 2. Initial config prop (from server-side tenant resolution)
 * 3. Falls back to default ChiselGrid branding
 */
export function TenantBrandingProvider({
  children,
  initialConfig,
}: TenantBrandingProviderProps) {
  const [config, setConfig] = useState<TenantConfig>(() => ({
    ...defaultTenantConfig,
    ...initialConfig,
    branding: {
      ...defaultBranding,
      ...initialConfig?.branding,
    },
  }));

  useEffect(() => {
    // Read CSS custom properties set by Lambda@Edge
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    const readVar = (name: string): string | undefined => {
      const value = computedStyle.getPropertyValue(name).trim();
      return value || undefined;
    };

    const cssOverrides: Partial<TenantBranding> = {};
    const primary = readVar('--tenant-primary');
    if (primary) cssOverrides.primaryColor = primary;
    const secondary = readVar('--tenant-secondary');
    if (secondary) cssOverrides.secondaryColor = secondary;
    const accent = readVar('--tenant-accent');
    if (accent) cssOverrides.accentColor = accent;
    const bg = readVar('--tenant-bg');
    if (bg) cssOverrides.backgroundColor = bg;
    const surface = readVar('--tenant-surface');
    if (surface) cssOverrides.surfaceColor = surface;
    const text = readVar('--tenant-text');
    if (text) cssOverrides.textColor = text;
    const font = readVar('--tenant-font');
    if (font) cssOverrides.fontFamily = font;
    const headingFont = readVar('--tenant-heading-font');
    if (headingFont) cssOverrides.headingFontFamily = headingFont;
    const radius = readVar('--tenant-radius');
    if (radius) cssOverrides.borderRadius = radius;

    if (Object.keys(cssOverrides).length > 0) {
      setConfig((prev) => ({
        ...prev,
        branding: { ...prev.branding, ...cssOverrides },
      }));
    }
  }, []);

  return (
    <TenantContext.Provider value={config}>
      {children}
    </TenantContext.Provider>
  );
}
