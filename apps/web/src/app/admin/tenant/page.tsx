'use client';

import { useState } from 'react';

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

interface FeatureFlags {
  aiContentGeneration: boolean;
  audioNarration: boolean;
  customDomain: boolean;
  ssoIntegration: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
  whiteLabel: boolean;
  maxContentItems: number;
  maxUsersCount: number;
  maxAiTokensPerMonth: number;
  maxStorageMb: number;
}

interface TenantSettings {
  name: string;
  subdomain: string;
  customDomain: string;
  plan: string;
  branding: BrandingConfig;
  featureFlags: FeatureFlags;
}

const defaultBranding: BrandingConfig = {
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

const defaultFeatureFlags: FeatureFlags = {
  aiContentGeneration: true,
  audioNarration: true,
  customDomain: false,
  ssoIntegration: false,
  apiAccess: false,
  advancedAnalytics: false,
  whiteLabel: false,
  maxContentItems: 100,
  maxUsersCount: 10,
  maxAiTokensPerMonth: 500_000,
  maxStorageMb: 1_000,
};

const FONT_OPTIONS = [
  'Inter, system-ui, sans-serif',
  'Georgia, serif',
  'Menlo, monospace',
  'Poppins, sans-serif',
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
  'Merriweather, serif',
];

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
      />
      <div className="flex-1">
        <label className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs font-mono"
        />
      </div>
    </div>
  );
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function TenantSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'features' | 'domain'>('general');
  const [settings, setSettings] = useState<TenantSettings>({
    name: 'My Organization',
    subdomain: 'my-org',
    customDomain: '',
    plan: 'professional',
    branding: defaultBranding,
    featureFlags: defaultFeatureFlags,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateBranding = (key: keyof BrandingConfig, value: string) => {
    setSettings((prev) => ({
      ...prev,
      branding: { ...prev.branding, [key]: value },
    }));
  };

  const updateFeature = (key: keyof FeatureFlags, value: boolean | number) => {
    setSettings((prev) => ({
      ...prev,
      featureFlags: { ...prev.featureFlags, [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // API call would go here
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'branding' as const, label: 'Branding' },
    { id: 'features' as const, label: 'Features' },
    { id: 'domain' as const, label: 'Custom Domain' },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your organization&apos;s branding, features, and custom domain.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Organization Name</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subdomain</label>
            <div className="mt-1 flex rounded-md">
              <input
                type="text"
                value={settings.subdomain}
                onChange={(e) => setSettings((prev) => ({ ...prev, subdomain: e.target.value }))}
                className="block w-full rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              />
              <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 px-3 text-sm text-gray-500">
                .chiselgrid.com
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plan</label>
            <div className="mt-1 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-400">
              {settings.plan.charAt(0).toUpperCase() + settings.plan.slice(1)}
            </div>
          </div>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Live Preview</h3>
            <div
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: settings.branding.backgroundColor,
                borderColor: settings.branding.borderColor,
                fontFamily: settings.branding.fontFamily,
              }}
            >
              <div
                className="text-lg font-bold mb-2"
                style={{
                  color: settings.branding.textColor,
                  fontFamily: settings.branding.headingFontFamily,
                }}
              >
                {settings.name}
              </div>
              <div className="flex gap-2 mb-3">
                <span
                  className="rounded px-3 py-1 text-white text-sm"
                  style={{ backgroundColor: settings.branding.primaryColor, borderRadius: settings.branding.borderRadius }}
                >
                  Primary
                </span>
                <span
                  className="rounded px-3 py-1 text-white text-sm"
                  style={{ backgroundColor: settings.branding.secondaryColor, borderRadius: settings.branding.borderRadius }}
                >
                  Secondary
                </span>
                <span
                  className="rounded px-3 py-1 text-white text-sm"
                  style={{ backgroundColor: settings.branding.accentColor, borderRadius: settings.branding.borderRadius }}
                >
                  Accent
                </span>
              </div>
              <p style={{ color: settings.branding.textSecondaryColor }} className="text-sm">
                This is how your content will appear to readers.
              </p>
            </div>
          </div>

          {/* Light Mode Colors */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Light Mode Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorInput label="Primary" value={settings.branding.primaryColor} onChange={(v) => updateBranding('primaryColor', v)} />
              <ColorInput label="Secondary" value={settings.branding.secondaryColor} onChange={(v) => updateBranding('secondaryColor', v)} />
              <ColorInput label="Accent" value={settings.branding.accentColor} onChange={(v) => updateBranding('accentColor', v)} />
              <ColorInput label="Background" value={settings.branding.backgroundColor} onChange={(v) => updateBranding('backgroundColor', v)} />
              <ColorInput label="Surface" value={settings.branding.surfaceColor} onChange={(v) => updateBranding('surfaceColor', v)} />
              <ColorInput label="Text" value={settings.branding.textColor} onChange={(v) => updateBranding('textColor', v)} />
              <ColorInput label="Text Secondary" value={settings.branding.textSecondaryColor} onChange={(v) => updateBranding('textSecondaryColor', v)} />
              <ColorInput label="Border" value={settings.branding.borderColor} onChange={(v) => updateBranding('borderColor', v)} />
            </div>
          </div>

          {/* Dark Mode Colors */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Dark Mode Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorInput label="Primary" value={settings.branding.darkPrimaryColor} onChange={(v) => updateBranding('darkPrimaryColor', v)} />
              <ColorInput label="Background" value={settings.branding.darkBackgroundColor} onChange={(v) => updateBranding('darkBackgroundColor', v)} />
              <ColorInput label="Surface" value={settings.branding.darkSurfaceColor} onChange={(v) => updateBranding('darkSurfaceColor', v)} />
              <ColorInput label="Text" value={settings.branding.darkTextColor} onChange={(v) => updateBranding('darkTextColor', v)} />
              <ColorInput label="Border" value={settings.branding.darkBorderColor} onChange={(v) => updateBranding('darkBorderColor', v)} />
            </div>
          </div>

          {/* Typography & Shape */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Typography & Shape</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Body Font</label>
                <select
                  value={settings.branding.fontFamily}
                  onChange={(e) => updateBranding('fontFamily', e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font}>{font.split(',')[0]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Heading Font</label>
                <select
                  value={settings.branding.headingFontFamily}
                  onChange={(e) => updateBranding('headingFontFamily', e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font}>{font.split(',')[0]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Border Radius</label>
                <select
                  value={settings.branding.borderRadius}
                  onChange={(e) => updateBranding('borderRadius', e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                >
                  <option value="0">None (0)</option>
                  <option value="0.25rem">Small (0.25rem)</option>
                  <option value="0.5rem">Medium (0.5rem)</option>
                  <option value="0.75rem">Large (0.75rem)</option>
                  <option value="1rem">XL (1rem)</option>
                  <option value="9999px">Full (pill)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logo & Favicon */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Logo & Favicon</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Logo URL</label>
                <input
                  type="url"
                  value={settings.branding.logoUrl}
                  onChange={(e) => updateBranding('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Favicon URL</label>
                <input
                  type="url"
                  value={settings.branding.faviconUrl}
                  onChange={(e) => updateBranding('faviconUrl', e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                  className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Feature Flags</h3>
          <ToggleSwitch
            label="AI Content Generation"
            description="Enable AI-powered content creation with Writer, Review, and SEO agents"
            checked={settings.featureFlags.aiContentGeneration}
            onChange={(v) => updateFeature('aiContentGeneration', v)}
          />
          <ToggleSwitch
            label="Audio Narration"
            description="Auto-generate audio narration for published articles via Amazon Polly"
            checked={settings.featureFlags.audioNarration}
            onChange={(v) => updateFeature('audioNarration', v)}
          />
          <ToggleSwitch
            label="Custom Domain"
            description="Use your own domain with SSL certificate"
            checked={settings.featureFlags.customDomain}
            onChange={(v) => updateFeature('customDomain', v)}
          />
          <ToggleSwitch
            label="SSO Integration"
            description="Enable SAML/OIDC single sign-on with your identity provider"
            checked={settings.featureFlags.ssoIntegration}
            onChange={(v) => updateFeature('ssoIntegration', v)}
          />
          <ToggleSwitch
            label="API Access"
            description="Enable REST API access for programmatic content management"
            checked={settings.featureFlags.apiAccess}
            onChange={(v) => updateFeature('apiAccess', v)}
          />
          <ToggleSwitch
            label="Advanced Analytics"
            description="Enable detailed reader analytics, content performance metrics, and AI cost tracking"
            checked={settings.featureFlags.advancedAnalytics}
            onChange={(v) => updateFeature('advancedAnalytics', v)}
          />
          <ToggleSwitch
            label="White Label"
            description="Remove ChiselGrid branding completely"
            checked={settings.featureFlags.whiteLabel}
            onChange={(v) => updateFeature('whiteLabel', v)}
          />

          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-6 mb-4">Usage Limits</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Max Content Items</label>
              <input
                type="number"
                value={settings.featureFlags.maxContentItems}
                onChange={(e) => updateFeature('maxContentItems', parseInt(e.target.value) || 0)}
                className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Max Users</label>
              <input
                type="number"
                value={settings.featureFlags.maxUsersCount}
                onChange={(e) => updateFeature('maxUsersCount', parseInt(e.target.value) || 0)}
                className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Max AI Tokens / Month</label>
              <input
                type="number"
                value={settings.featureFlags.maxAiTokensPerMonth}
                onChange={(e) => updateFeature('maxAiTokensPerMonth', parseInt(e.target.value) || 0)}
                className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Max Storage (MB)</label>
              <input
                type="number"
                value={settings.featureFlags.maxStorageMb}
                onChange={(e) => updateFeature('maxStorageMb', parseInt(e.target.value) || 0)}
                className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Domain Tab */}
      {activeTab === 'domain' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Custom Domain</h3>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Domain Name</label>
              <input
                type="text"
                value={settings.customDomain}
                onChange={(e) => setSettings((prev) => ({ ...prev, customDomain: e.target.value }))}
                placeholder="blog.yourcompany.com"
                className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter your custom domain. We&apos;ll generate an SSL certificate and provide DNS records for you to configure.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Setup Instructions</h3>
            <ol className="text-sm text-blue-600 dark:text-blue-300 space-y-2 list-decimal list-inside">
              <li>Enter your custom domain above and save</li>
              <li>Add the CNAME validation record to your DNS provider</li>
              <li>Wait for SSL certificate validation (usually 5-30 minutes)</li>
              <li>Add a CNAME record pointing your domain to our CloudFront distribution</li>
              <li>Your custom domain will be active within minutes</li>
            </ol>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">Changes saved successfully</span>
        )}
      </div>
    </div>
  );
}
