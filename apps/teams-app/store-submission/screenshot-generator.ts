/**
 * T-20.12 Screenshot Generator
 *
 * Generates HTML mockups for Teams App Store submission.
 * In production, these would be rendered to PNG via Puppeteer Lambda.
 *
 * Required screenshots:
 * - 5 desktop (1366x768)
 * - 2 mobile (360x640)
 */

interface Screenshot {
  name: string;
  width: number;
  height: number;
  description: string;
  htmlContent: string;
}

export const screenshots: Screenshot[] = [
  {
    name: 'desktop-knowledge-bot',
    width: 1366,
    height: 768,
    description: 'Knowledge Bot answering engineering questions in Teams chat',
    htmlContent: `
      <div style="font-family: Segoe UI, sans-serif; width: 1366px; height: 768px; background: #f5f5f5; display: flex;">
        <div style="width: 260px; background: #292929; color: white; padding: 16px;">
          <div style="padding: 12px; background: #3d3d3d; border-radius: 4px; margin-bottom: 8px;">ChiselGrid Bot</div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="padding: 16px; border-bottom: 1px solid #ddd; background: white;">
            <strong>ChiselGrid Knowledge Bot</strong>
          </div>
          <div style="flex: 1; padding: 24px; overflow-y: auto;">
            <div style="max-width: 600px; margin-bottom: 16px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <strong>You:</strong> How do we handle API rate limiting?
            </div>
            <div style="max-width: 600px; padding: 12px; background: #e8eaf6; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <strong>ChiselGrid Bot:</strong> Based on our knowledge base, here are the top results:<br/><br/>
              <strong>1. API Rate Limiting Best Practices</strong> by Sarah Chen<br/>
              Score: 95% — Covers token bucket algorithm, retry headers...<br/><br/>
              <strong>2. Gateway Configuration Guide</strong> by Mike Johnson<br/>
              Score: 87% — AWS API Gateway throttling setup...
            </div>
          </div>
        </div>
      </div>
    `,
  },
  {
    name: 'desktop-review-card',
    width: 1366,
    height: 768,
    description: 'Review request Adaptive Card in Teams channel',
    htmlContent: `
      <div style="font-family: Segoe UI, sans-serif; width: 1366px; height: 768px; background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
        <div style="width: 500px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 24px;">
          <h3 style="margin: 0 0 8px;">Review Request</h3>
          <h2 style="margin: 0 0 12px; color: #1a1a2e;">Kubernetes Pod Security Standards</h2>
          <p style="color: #666;">by Alex Rivera — Submitted Apr 5, 2026</p>
          <div style="display: flex; align-items: center; gap: 16px; margin: 16px 0; padding: 12px; background: #f0fdf4; border-radius: 4px;">
            <span style="font-size: 32px; font-weight: bold; color: #16a34a;">92</span>
            <span style="color: #666;">AI Quality Score</span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button style="padding: 8px 24px; background: #16a34a; color: white; border: none; border-radius: 4px;">Approve</button>
            <button style="padding: 8px 24px; background: #dc2626; color: white; border: none; border-radius: 4px;">Reject</button>
            <button style="padding: 8px 24px; background: #e5e7eb; border: none; border-radius: 4px;">Preview</button>
          </div>
        </div>
      </div>
    `,
  },
  {
    name: 'desktop-tab-dashboard',
    width: 1366,
    height: 768,
    description: 'ChiselGrid dashboard embedded as Teams tab',
    htmlContent: `
      <div style="font-family: Segoe UI, sans-serif; width: 1366px; height: 768px; background: white; padding: 24px;">
        <h1 style="margin: 0 0 24px; color: #1a1a2e;">ChiselGrid Knowledge Base</h1>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="color: #6366f1; margin: 0;">247</h3><p style="color: #666; margin: 4px 0 0;">Published Articles</p>
          </div>
          <div style="padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="color: #6366f1; margin: 0;">12</h3><p style="color: #666; margin: 4px 0 0;">Pending Reviews</p>
          </div>
          <div style="padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="color: #6366f1; margin: 0;">38</h3><p style="color: #666; margin: 4px 0 0;">Contributors</p>
          </div>
        </div>
      </div>
    `,
  },
  {
    name: 'desktop-channel-post',
    width: 1366,
    height: 768,
    description: 'Auto-posted article notification in Teams channel',
    htmlContent: `
      <div style="font-family: Segoe UI, sans-serif; width: 1366px; height: 768px; background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
        <div style="width: 500px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 24px;">
          <div style="color: #16a34a; font-size: 12px; font-weight: bold; margin-bottom: 8px;">NEW ARTICLE PUBLISHED</div>
          <h2 style="margin: 0 0 8px;">Microservices Communication Patterns</h2>
          <p style="color: #666; margin: 0 0 12px;">by Priya Sharma — 8 min read — AI Score: 94/100</p>
          <p style="color: #444;">A comprehensive guide to synchronous vs asynchronous communication between microservices...</p>
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button style="padding: 8px 24px; background: #6366f1; color: white; border: none; border-radius: 4px;">Read Article</button>
            <button style="padding: 8px 24px; background: #e5e7eb; border: none; border-radius: 4px;">Listen</button>
          </div>
        </div>
      </div>
    `,
  },
  {
    name: 'desktop-draft-progress',
    width: 1366,
    height: 768,
    description: 'AI draft generation progress card in Teams',
    htmlContent: `
      <div style="font-family: Segoe UI, sans-serif; width: 1366px; height: 768px; background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
        <div style="width: 500px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 24px;">
          <h3 style="margin: 0 0 16px;">Draft Generation in Progress</h3>
          <p><strong>Topic:</strong> CI/CD Pipeline Best Practices</p>
          <p><strong>Current Agent:</strong> Review Agent</p>
          <div style="background: #e5e7eb; border-radius: 4px; height: 8px; margin: 16px 0;">
            <div style="background: #6366f1; border-radius: 4px; height: 8px; width: 65%;"></div>
          </div>
          <p style="text-align: center; color: #666;">65% complete — ETA: 3 minutes</p>
          <div style="margin-top: 12px; font-size: 13px; color: #666;">
            <p>Writer Agent — Complete</p>
            <p style="color: #6366f1; font-weight: bold;">Review Agent — Running...</p>
            <p>SEO Agent — Pending</p>
          </div>
        </div>
      </div>
    `,
  },
  {
    name: 'mobile-knowledge-bot',
    width: 360,
    height: 640,
    description: 'Knowledge Bot chat on mobile Teams',
    htmlContent: `
      <div style="font-family: Segoe UI, sans-serif; width: 360px; height: 640px; background: #f5f5f5; display: flex; flex-direction: column;">
        <div style="padding: 12px 16px; background: #292929; color: white;">
          <strong>ChiselGrid Bot</strong>
        </div>
        <div style="flex: 1; padding: 16px; overflow-y: auto;">
          <div style="padding: 10px; background: white; border-radius: 8px; margin-bottom: 12px; font-size: 14px;">
            How do we handle database migrations?
          </div>
          <div style="padding: 10px; background: #e8eaf6; border-radius: 8px; font-size: 14px;">
            <strong>ChiselGrid:</strong> Found 2 articles:<br/>
            1. Database Migration Strategy (92%)<br/>
            2. Flyway vs Liquibase Guide (85%)
          </div>
        </div>
      </div>
    `,
  },
  {
    name: 'mobile-article-card',
    width: 360,
    height: 640,
    description: 'Article notification card on mobile Teams',
    htmlContent: `
      <div style="font-family: Segoe UI, sans-serif; width: 360px; height: 640px; background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
        <div style="width: 320px; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
          <div style="color: #16a34a; font-size: 11px; font-weight: bold;">NEW ARTICLE</div>
          <h3 style="margin: 4px 0 8px; font-size: 16px;">API Security Checklist</h3>
          <p style="color: #666; font-size: 13px; margin: 0 0 12px;">by David Kim — 5 min — Score: 91</p>
          <button style="width: 100%; padding: 10px; background: #6366f1; color: white; border: none; border-radius: 4px;">Read Article</button>
        </div>
      </div>
    `,
  },
];

/**
 * Generate HTML file for each screenshot that can be rendered to PNG.
 */
export function generateScreenshotHtml(screenshot: Screenshot): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${screenshot.width}px; height: ${screenshot.height}px; overflow: hidden; }
  </style>
</head>
<body>
  ${screenshot.htmlContent}
</body>
</html>`;
}
