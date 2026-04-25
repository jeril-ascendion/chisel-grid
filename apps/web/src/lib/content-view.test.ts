import { describe, it, expect } from 'vitest';
import {
  pathToContentView,
  isValidContentView,
  hrefForContentView,
  CONTENT_VIEW_STORAGE_KEY,
} from './content-view';

describe('pathToContentView', () => {
  it('returns "table" for the bare /admin/content path', () => {
    expect(pathToContentView('/admin/content')).toBe('table');
  });

  it('returns "board" for /admin/content/board and any nested path', () => {
    expect(pathToContentView('/admin/content/board')).toBe('board');
    expect(pathToContentView('/admin/content/board/something')).toBe('board');
  });

  it('returns "timeline" for /admin/content/timeline', () => {
    expect(pathToContentView('/admin/content/timeline')).toBe('timeline');
  });

  it('falls back to "table" for unrelated admin paths', () => {
    expect(pathToContentView('/admin/queue')).toBe('table');
    expect(pathToContentView('/admin/content/abc/edit')).toBe('table');
  });
});

describe('isValidContentView', () => {
  it('accepts the three view ids', () => {
    expect(isValidContentView('table')).toBe(true);
    expect(isValidContentView('board')).toBe(true);
    expect(isValidContentView('timeline')).toBe(true);
  });

  it('rejects null, empty, and arbitrary strings', () => {
    expect(isValidContentView(null)).toBe(false);
    expect(isValidContentView('')).toBe(false);
    expect(isValidContentView('grid')).toBe(false);
    expect(isValidContentView('TABLE')).toBe(false);
  });
});

describe('hrefForContentView', () => {
  it('maps each id to its route', () => {
    expect(hrefForContentView('table')).toBe('/admin/content');
    expect(hrefForContentView('board')).toBe('/admin/content/board');
    expect(hrefForContentView('timeline')).toBe('/admin/content/timeline');
  });
});

describe('CONTENT_VIEW_STORAGE_KEY', () => {
  it('uses the canonical localStorage key the switcher reads', () => {
    expect(CONTENT_VIEW_STORAGE_KEY).toBe('cg.adminContentView');
  });
});
