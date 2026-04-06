import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api-client';
import type { Article, Category } from '@/lib/types';
import { ArticleCard } from '@/components/article-card';
import { CategoryTabs } from '@/components/category-tabs';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  const loadArticles = useCallback(
    async (reset = false) => {
      try {
        const result = await apiClient.listArticles({
          status: 'published',
          categoryId: selectedCategory ?? undefined,
          cursor: reset ? undefined : cursor,
          limit: 12,
        });
        setArticles((prev) => (reset ? result.items : [...prev, ...result.items]));
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('Failed to load articles:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory, cursor],
  );

  useEffect(() => {
    void loadArticles(true);
  }, [selectedCategory]);

  useEffect(() => {
    void apiClient.listCategories().then(setCategories).catch(console.error);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void loadArticles(true);
  };

  const onEndReached = () => {
    if (hasMore && !loading) {
      void loadArticles(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <CategoryTabs
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
      <FlatList
        data={articles}
        keyExtractor={(item) => item.contentId}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={() => router.push(`/article/${item.slug}`)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, isDark && styles.textDark]}>
                No articles found
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  containerDark: { backgroundColor: '#0A0A0A' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },
  textDark: { color: '#9CA3AF' },
});
