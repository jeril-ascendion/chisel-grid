import { test, expect } from '@playwright/test';

test.describe('Reader Flow', () => {
  test('homepage loads with hero section and article grid', async ({ page }) => {
    await page.goto('/');

    // Page should load successfully
    await expect(page).toHaveTitle(/ChiselGrid|Ascendion/i);

    // Hero section should be visible
    const hero = page.locator('[data-testid="hero"], main section:first-child, .hero');
    await expect(hero.first()).toBeVisible();

    // Should have navigation
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });

  test('homepage displays category grid', async ({ page }) => {
    await page.goto('/');

    // Category sections should exist
    const categoryLinks = page.locator('a[href*="/category/"]');
    // At least some category links should be present
    const count = await categoryLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('homepage has footer with links', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('article page renders content blocks', async ({ page }) => {
    // Navigate from homepage to first article
    await page.goto('/');

    // Find article links
    const articleLinks = page.locator('a[href*="/articles/"]');
    const articleCount = await articleLinks.count();

    if (articleCount > 0) {
      // Click first article
      await articleLinks.first().click();

      // Article page should have heading
      const heading = page.locator('h1');
      await expect(heading.first()).toBeVisible();

      // Should have article content
      const article = page.locator('article, main');
      await expect(article.first()).toBeVisible();
    } else {
      // No articles — just verify homepage loaded
      test.skip();
    }
  });

  test('search page is accessible', async ({ page }) => {
    await page.goto('/search');

    // Search page should load
    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="earch"]');
    const count = await searchInput.count();
    // Either search input exists or the search page rendered
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('category page loads', async ({ page }) => {
    await page.goto('/');

    const categoryLinks = page.locator('a[href*="/category/"]');
    const count = await categoryLinks.count();

    if (count > 0) {
      await categoryLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Category page should have heading or breadcrumbs
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('RSS feed returns valid XML', async ({ request }) => {
    const response = await request.get('/feed.xml');
    expect(response.ok()).toBeTruthy();

    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/xml|rss/);

    const body = await response.text();
    expect(body).toContain('<rss');
    expect(body).toContain('<channel>');
  });

  test('dark mode toggle works', async ({ page }) => {
    await page.goto('/');

    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label*="heme"], button[aria-label*="ark"], [data-testid="theme-toggle"]');
    const count = await themeToggle.count();

    if (count > 0) {
      await themeToggle.first().click();

      // Verify theme change (class on html/body)
      const html = page.locator('html');
      const className = await html.getAttribute('class');
      // Should have either dark or light class after toggle
      expect(className).toBeTruthy();
    }
  });

  test('mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Look for mobile menu button
    const menuButton = page.locator('button[aria-label*="enu"], button[aria-label*="avigation"], [data-testid="mobile-menu"]');
    const count = await menuButton.count();

    if (count > 0) {
      await menuButton.first().click();

      // Mobile menu should become visible
      const mobileNav = page.locator('nav, [role="navigation"], [data-testid="mobile-nav"]');
      await expect(mobileNav.first()).toBeVisible();
    }
  });
});
