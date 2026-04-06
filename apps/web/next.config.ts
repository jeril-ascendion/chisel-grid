/**
 * T-11.2 & T-11.5: Next.js config for Core Web Vitals and cache optimization
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization for CWV (LCP < 2.5s)
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Headers for CloudFront cache optimization and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Static assets: long cache with stale-while-revalidate
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Images: cache for 30 days
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // RSS and sitemap: cache for 1 hour
        source: '/(feed.xml|sitemap.xml)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },

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
