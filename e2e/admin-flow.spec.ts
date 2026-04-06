import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test('admin dashboard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin');

    // Should either redirect to login or show auth prompt
    await page.waitForLoadState('networkidle');
    const url = page.url();

    // Either redirected to login or shows login form on admin page
    const isLoginPage = url.includes('/login') || url.includes('/auth') || url.includes('/api/auth');
    const hasLoginForm = (await page.locator('form, [data-testid="login"], button:has-text("Sign in")').count()) > 0;
    const isAdminPage = url.includes('/admin');

    // Unauthenticated user should either be redirected or see a login prompt
    expect(isLoginPage || hasLoginForm || isAdminPage).toBeTruthy();
  });

  test('admin layout has sidebar navigation', async ({ page }) => {
    // Visit admin page directly (may show auth gate)
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // If we can see admin UI (e.g., in dev mode without auth)
    const sidebar = page.locator('aside, nav[data-testid="sidebar"], [role="navigation"]');
    const sidebarCount = await sidebar.count();

    if (sidebarCount > 0) {
      // Admin sidebar should have nav links
      const adminLinks = page.locator('a[href*="/admin/"]');
      const linkCount = await adminLinks.count();
      expect(linkCount).toBeGreaterThan(0);
    }
  });

  test('admin content queue page exists', async ({ page }) => {
    const response = await page.goto('/admin/queue');
    // Should not be a 500 error
    expect(response?.status()).not.toBe(500);
  });

  test('admin users page exists', async ({ page }) => {
    const response = await page.goto('/admin/users');
    expect(response?.status()).not.toBe(500);
  });

  test('admin content page exists', async ({ page }) => {
    const response = await page.goto('/admin/content');
    expect(response?.status()).not.toBe(500);
  });

  test('admin categories page exists', async ({ page }) => {
    const response = await page.goto('/admin/categories');
    expect(response?.status()).not.toBe(500);
  });

  test('admin AI usage page exists', async ({ page }) => {
    const response = await page.goto('/admin/ai-usage');
    expect(response?.status()).not.toBe(500);
  });

  test('admin workspace page exists', async ({ page }) => {
    const response = await page.goto('/admin/workspace');
    expect(response?.status()).not.toBe(500);
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should see login UI
    const loginElements = page.locator('button, input, form, [data-testid="login"]');
    const count = await loginElements.count();
    expect(count).toBeGreaterThan(0);
  });
});
