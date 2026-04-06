import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api-client';
import type { Article } from '@/lib/types';
import { ArticleCard } from '@/components/article-card';
import { useOfflineStore } from '@/stores/offline-store';

export default function SearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { recentSearches, addRecentSearch } = useOfflineStore();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const items = await apiClient.search(q);
      setResults(items);
      addRecentSearch(q);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void search(text), 300);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.searchBar}>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Search articles..."
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          value={query}
          onChangeText={onChangeText}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {query.length === 0 && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.recentTitle, isDark && styles.textDark]}>
            Recent Searches
          </Text>
          {recentSearches.slice(0, 5).map((s, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setQuery(s);
                void search(s);
              }}
            >
              <Text style={[styles.recentItem, isDark && styles.textDark]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.contentId}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={() => router.push(`/article/${item.slug}`)}
          />
        )}
        ListEmptyComponent={
          query.length >= 2 && !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, isDark && styles.textDark]}>
                No results for "{query}"
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
  searchBar: { padding: 16, paddingBottom: 8 },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  inputDark: { backgroundColor: '#1F2937', color: '#F9FAFB' },
  list: { paddingHorizontal: 16 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },
  textDark: { color: '#9CA3AF' },
  recentSection: { paddingHorizontal: 16, paddingBottom: 8 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  recentItem: { fontSize: 16, color: '#6B7280', paddingVertical: 6 },
});
