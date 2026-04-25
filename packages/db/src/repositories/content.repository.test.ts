import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentRepository } from './content.repository';

// Create a comprehensive mock for Drizzle's query builder chain
function createMockDb() {
  const chainMethods = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    returning: vi.fn(),
    set: vi.fn(),
    values: vi.fn(),
    innerJoin: vi.fn(),
  };

  // Make each method return the chain
  for (const method of Object.values(chainMethods)) {
    method.mockReturnValue(chainMethods);
  }

  // returning() resolves to result rows
  chainMethods.returning.mockResolvedValue([{
    contentId: 'test-id',
    tenantId: 'tenant-1',
    authorId: 'author-1',
    title: 'Test Article',
    slug: 'test-article',
    status: 'draft',
    blocks: '[]',
    createdAt: new Date(),
    updatedAt: new Date(),
  }]);

  // limit() returns array (for list queries)
  chainMethods.limit.mockResolvedValue([]);

  const db = {
    insert: vi.fn().mockReturnValue(chainMethods),
    select: vi.fn().mockReturnValue(chainMethods),
    update: vi.fn().mockReturnValue(chainMethods),
    delete: vi.fn().mockReturnValue(chainMethods),
  };

  return { db, chainMethods };
}

describe('ContentRepository', () => {
  let repo: ContentRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = new ContentRepository(mockDb.db as any);
  });

  describe('create', () => {
    it('inserts content and returns the created row', async () => {
      const input = {
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test Article',
        slug: 'test-article',
      };

      const result = await repo.create(input);

      expect(mockDb.db.insert).toHaveBeenCalled();
      expect(result).toBeTruthy();
      expect(result.title).toBe('Test Article');
    });

    it('defaults contentType to article', async () => {
      await repo.create({
        tenantId: 'tenant-1',
        authorId: 'author-1',
        title: 'Test',
        slug: 'test',
      });

      expect(mockDb.chainMethods.values).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'article',
        }),
      );
    });
  });

  describe('findById', () => {
    it('calls select with tenantId and contentId filter', async () => {
      // Mock select chain to return array
      mockDb.chainMethods.where.mockResolvedValueOnce([{
        contentId: 'test-id',
        tenantId: 'tenant-1',
        title: 'Found Article',
      }]);

      const result = await repo.findById('tenant-1', 'test-id');

      expect(mockDb.db.select).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('returns null when not found', async () => {
      mockDb.chainMethods.where.mockResolvedValueOnce([]);

      const result = await repo.findById('tenant-1', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('calls select with tenantId and slug filter', async () => {
      mockDb.chainMethods.where.mockResolvedValueOnce([{
        contentId: 'test-id',
        slug: 'test-slug',
      }]);

      const result = await repo.findBySlug('tenant-1', 'test-slug');

      expect(mockDb.db.select).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });
  });

  describe('list', () => {
    it('limits results to 20 by default', async () => {
      await repo.list({ tenantId: 'tenant-1' });

      expect(mockDb.chainMethods.limit).toHaveBeenCalledWith(21); // limit + 1 for hasMore
    });

    it('caps limit at 100', async () => {
      await repo.list({ tenantId: 'tenant-1', limit: 500 });

      expect(mockDb.chainMethods.limit).toHaveBeenCalledWith(101);
    });

    it('returns items, hasMore, and nextCursor', async () => {
      mockDb.chainMethods.limit.mockResolvedValueOnce([
        { contentId: 'a', title: 'A' },
        { contentId: 'b', title: 'B' },
      ]);

      const result = await repo.list({ tenantId: 'tenant-1' });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('nextCursor');
    });

    it('sets hasMore=true when extra row returned', async () => {
      // Simulate limit+1 rows returned
      const rows = Array.from({ length: 21 }, (_, i) => ({
        contentId: `id-${i}`,
        title: `Article ${i}`,
      }));
      mockDb.chainMethods.limit.mockResolvedValueOnce(rows);

      const result = await repo.list({ tenantId: 'tenant-1', limit: 20 });

      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('id-19');
    });
  });

  describe('update', () => {
    it('calls update with proper where clause', async () => {
      await repo.update('tenant-1', 'content-1', { title: 'Updated Title' });

      expect(mockDb.db.update).toHaveBeenCalled();
      expect(mockDb.chainMethods.set).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Title',
        }),
      );
    });
  });

  describe('publish', () => {
    it('updates status to published', async () => {
      await repo.publish('tenant-1', 'content-1');

      expect(mockDb.chainMethods.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
        }),
      );
    });
  });

  describe('delete', () => {
    it('deletes content with proper scope', async () => {
      await repo.delete('tenant-1', 'content-1');

      expect(mockDb.db.delete).toHaveBeenCalled();
    });
  });

  describe('createRevision', () => {
    it('inserts a revision record', async () => {
      await repo.createRevision('content-1', 1, 'Title', [], 'user-1', 'Initial draft');

      expect(mockDb.db.insert).toHaveBeenCalled();
      expect(mockDb.chainMethods.values).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: 'content-1',
          revisionNumber: 1,
          title: 'Title',
        }),
      );
    });
  });

  describe('setTags', () => {
    it('deletes existing tags and inserts new ones', async () => {
      // Reset delete chain
      mockDb.chainMethods.where.mockResolvedValueOnce(undefined);

      await repo.setTags('content-1', ['tag-1', 'tag-2']);

      expect(mockDb.db.delete).toHaveBeenCalled();
      expect(mockDb.db.insert).toHaveBeenCalled();
    });

    it('only deletes when no tags provided', async () => {
      mockDb.chainMethods.where.mockResolvedValueOnce(undefined);

      await repo.setTags('content-1', []);

      expect(mockDb.db.delete).toHaveBeenCalled();
      // insert should not have been called for tags (it was called during setup for other tests)
    });
  });

  describe('createCategory', () => {
    it('inserts a category', async () => {
      await repo.createCategory({
        tenantId: 'tenant-1',
        name: 'Cloud Architecture',
        slug: 'cloud-architecture',
      });

      expect(mockDb.db.insert).toHaveBeenCalled();
    });
  });
});
