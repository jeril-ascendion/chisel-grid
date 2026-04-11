/**
 * T-11.2 & T-11.5: Next.js config for Core Web Vitals and cache optimization
 */
import type { NextConfig } from 'next';

const isStaticExport = process.env.NEXT_OUTPUT === 'export';

const nextConfig: NextConfig = {
  // Static export only when NEXT_OUTPUT=export (for S3 + CloudFront deployment).
  // Server mode is required for NextAuth API routes.
  ...(isStaticExport ? { output: 'export' as const, trailingSlash: true } : {}),

  // Image optimization for CWV (LCP < 2.5s)
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    unoptimized: true,
  },

  // Note: Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
  // are set via CloudFront response headers policy, not here.
  // headers() config is not applied with output: 'export'.

  // Transpile monorepo packages that use .js extensions in TS imports (NodeNext resolution)
  transpilePackages: [
    '@chiselgrid/studio-core',
    '@chiselgrid/studio-agents',
    '@chiselgrid/ai',
  ],

  // Compression (Brotli is handled by CloudFront, but enable gzip for direct access)
  compress: true,

  // Reduce bundle size
  reactStrictMode: true,

  // Production source maps off for smaller bundles
  productionBrowserSourceMaps: false,

  // Experimental optimizations
  experimental: {
    optimizeCss: true,
  },

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {},
  },

  // Resolve .js extensions to .ts for monorepo packages using NodeNext module resolution
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
