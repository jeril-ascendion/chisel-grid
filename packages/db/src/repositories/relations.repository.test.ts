import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationsRepository } from './relations.repository';

function createMockTx() {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    set: vi.fn(),
    values: vi.fn(),
    onConflictDoNothing: vi.fn(),
    returning: vi.fn(),
  };
  for (const fn of Object.values(chain)) fn.mockReturnValue(chain);

  const tx = {
    insert: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    delete: vi.fn().mockReturnValue(chain),
    select: vi.fn().mockReturnValue(chain),
    execute: vi.fn(),
  };
  return { tx, chain };
}

function createMockDb() {
  const { tx, chain } = createMockTx();
  const db = {
    ...tx,
    transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { db, tx, chain };
}

describe('RelationsRepository', () => {
  let mock: ReturnType<typeof createMockDb>;
  let repo: RelationsRepository;

  beforeEach(() => {
    mock = createMockDb();
    repo = new RelationsRepository(mock.db as any);
  });

  describe('insertRelation', () => {
    it('rejects self-link before any DB call', async () => {
      await expect(
        repo.insertRelation({
          tenantId: 't',
          sourceId: 'a',
          sourceType: 'article',
          targetId: 'a',
          targetType: 'article',
          relationType: 'references',
        }),
      ).rejects.toThrow('self_link_not_allowed');
      expect(mock.db.transaction).not.toHaveBeenCalled();
    });

    it('throws target_not_found when article missing', async () => {
      mock.tx.execute.mockResolvedValueOnce({ rows: [] });

      await expect(
        repo.insertRelation({
          tenantId: 't',
          sourceId: 's',
          sourceType: 'article',
          targetId: 'gone',
          targetType: 'article',
          relationType: 'references',
        }),
      ).rejects.toThrow('target_not_found');
    });

    it('inserts edge and bumps counter on success', async () => {
      // existence check OK
      mock.tx.execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      // insert returning
      mock.chain.returning.mockResolvedValueOnce([
        { id: 'edge-1', targetType: 'article', targetId: 't1' },
      ]);

      const row = await repo.insertRelation({
        tenantId: 't',
        sourceId: 's',
        sourceType: 'article',
        targetId: 't1',
        targetType: 'article',
        relationType: 'references',
      });

      expect(row).toBeTruthy();
      expect(mock.tx.update).toHaveBeenCalled();
    });

    it('returns null on conflict (duplicate edge) without bumping', async () => {
      mock.tx.execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      mock.chain.returning.mockResolvedValueOnce([]);

      const row = await repo.insertRelation({
        tenantId: 't',
        sourceId: 's',
        sourceType: 'article',
        targetId: 't1',
        targetType: 'article',
        relationType: 'references',
      });

      expect(row).toBeNull();
      expect(mock.tx.update).not.toHaveBeenCalled();
    });

    it('skips existence check for session targets (table does not exist)', async () => {
      mock.chain.returning.mockResolvedValueOnce([
        { id: 'edge-1', targetType: 'session', targetId: 'sess-1' },
      ]);

      await repo.insertRelation({
        tenantId: 't',
        sourceId: 's',
        sourceType: 'diagram',
        targetId: 'sess-1',
        targetType: 'session',
        relationType: 'created_from',
      });

      // execute called only by enrichWithTitles path (not used here) — none
      expect(mock.tx.execute).not.toHaveBeenCalled();
    });
  });

  describe('deleteRelation', () => {
    it('returns null when row not found, does not bump', async () => {
      mock.chain.returning.mockResolvedValueOnce([]);

      const row = await repo.deleteRelation('t', 'missing');
      expect(row).toBeNull();
      expect(mock.tx.execute).not.toHaveBeenCalled();
    });

    it('decrements counter for article target', async () => {
      mock.chain.returning.mockResolvedValueOnce([
        { id: 'edge-1', targetType: 'article', targetId: 't1' },
      ]);

      await repo.deleteRelation('t', 'edge-1');

      // article decrement uses execute (GREATEST clamp)
      expect(mock.tx.execute).toHaveBeenCalled();
    });
  });

  describe('getRelations / getBacklinks', () => {
    it('returns empty array when no rows', async () => {
      mock.chain.where.mockResolvedValueOnce([]);
      const out = await repo.getRelations('t', 's', 'article');
      expect(out).toEqual([]);
    });

    it('backlinks empty path is short-circuit', async () => {
      mock.chain.where.mockResolvedValueOnce([]);
      const out = await repo.getBacklinks('t', 't1', 'article');
      expect(out).toEqual([]);
    });
  });
});
