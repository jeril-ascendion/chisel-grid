/**
 * T-11.2: Core Web Vitals reporting
 * Reports CWV metrics to analytics endpoint.
 * LCP < 2.5s, CLS < 0.1, FID < 100ms targets.
 */

export type WebVitalMetric = {
  id: string;
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
};

/** CWV thresholds per Google's guidelines */
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

export function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'good';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

export function reportWebVitals(metric: WebVitalMetric): void {
  // In production: send to analytics endpoint
  // For now: log to console in development
  if (process.env.NODE_ENV === 'development') {
    const color =
      metric.rating === 'good'
        ? '\x1b[32m'
        : metric.rating === 'needs-improvement'
          ? '\x1b[33m'
          : '\x1b[31m';
    console.log(`${color}[CWV] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})\x1b[0m`);
  }

  // Production: send to CloudWatch or analytics service
  // const body = JSON.stringify({
  //   name: metric.name,
  //   value: metric.value,
  //   rating: metric.rating,
  //   id: metric.id,
  //   page: window.location.pathname,
  // });
  // navigator.sendBeacon('/api/vitals', body);
}
