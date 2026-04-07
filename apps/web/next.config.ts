/**
 * T-11.2 & T-11.5: Next.js config for Core Web Vitals and cache optimization
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for S3 + CloudFront deployment
  output: 'export',
  trailingSlash: true,

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
};

export default nextConfig;
