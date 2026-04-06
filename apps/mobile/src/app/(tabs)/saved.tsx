import { View, Text, FlatList, StyleSheet, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useOfflineStore } from '@/stores/offline-store';
import { ArticleCard } from '@/components/article-card';

export default function SavedScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { savedArticles } = useOfflineStore();

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <FlatList
        data={savedArticles}
        keyExtractor={(item) => item.contentId}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={() => router.push(`/article/${item.slug}`)}
            showOfflineBadge
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
              No saved articles
            </Text>
            <Text style={[styles.emptySubtitle, isDark && styles.textDark]}>
              Save articles for offline reading from the article detail page.
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  containerDark: { backgroundColor: '#0A0A0A' },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  textDark: { color: '#9CA3AF' },
});
