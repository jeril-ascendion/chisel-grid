import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';
import type { Article } from '@/lib/types';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('chiselgrid.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS saved_articles (
        contentId TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        savedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recent_searches (
        query TEXT PRIMARY KEY,
        searchedAt TEXT NOT NULL
      );
    `);
  }
  return db;
}

interface OfflineState {
  savedArticles: Article[];
  recentSearches: string[];
  isArticleSaved: (contentId: string) => boolean;
  saveArticle: (article: Article) => void;
  removeArticle: (contentId: string) => void;
  addRecentSearch: (query: string) => void;
  loadOfflineData: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  savedArticles: [],
  recentSearches: [],

  isArticleSaved: (contentId: string) => {
    return get().savedArticles.some((a) => a.contentId === contentId);
  },

  saveArticle: (article: Article) => {
    set((state) => ({
      savedArticles: [...state.savedArticles, article],
    }));

    void (async () => {
      const database = await getDb();
      await database.runAsync(
        'INSERT OR REPLACE INTO saved_articles (contentId, data, savedAt) VALUES (?, ?, ?)',
        [article.contentId, JSON.stringify(article), new Date().toISOString()],
      );
    })();
  },

  removeArticle: (contentId: string) => {
    set((state) => ({
      savedArticles: state.savedArticles.filter((a) => a.contentId !== contentId),
    }));

    void (async () => {
      const database = await getDb();
      await database.runAsync('DELETE FROM saved_articles WHERE contentId = ?', [contentId]);
    })();
  },

  addRecentSearch: (query: string) => {
    set((state) => ({
      recentSearches: [query, ...state.recentSearches.filter((s) => s !== query)].slice(0, 10),
    }));

    void (async () => {
      const database = await getDb();
      await database.runAsync(
        'INSERT OR REPLACE INTO recent_searches (query, searchedAt) VALUES (?, ?)',
        [query, new Date().toISOString()],
      );
    })();
  },

  loadOfflineData: async () => {
    try {
      const database = await getDb();

      const articles = await database.getAllAsync<{ data: string }>(
        'SELECT data FROM saved_articles ORDER BY savedAt DESC',
      );
      const searches = await database.getAllAsync<{ query: string }>(
        'SELECT query FROM recent_searches ORDER BY searchedAt DESC LIMIT 10',
      );

      set({
        savedArticles: articles.map((row) => JSON.parse(row.data) as Article),
        recentSearches: searches.map((row) => row.query),
      });
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  },
}));
