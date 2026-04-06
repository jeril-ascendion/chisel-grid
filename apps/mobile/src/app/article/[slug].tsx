import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/lib/api-client';
import type { Article } from '@/lib/types';
import { BlockRenderer } from '@/components/block-renderer';
import { AudioPlayer } from '@/components/audio-player';
import { useOfflineStore } from '@/stores/offline-store';

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const { saveArticle, removeArticle, isArticleSaved } = useOfflineStore();
  const saved = article ? isArticleSaved(article.contentId) : false;

  useEffect(() => {
    if (!slug) return;
    void apiClient
      .getArticle(slug)
      .then(setArticle)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.center]}>
        <Text style={[styles.errorText, isDark && styles.textDark]}>Article not found</Text>
      </View>
    );
  }

  const blocks = typeof article.blocks === 'string'
    ? JSON.parse(article.blocks)
    : article.blocks ?? [];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, isDark && styles.textDark]}>{article.title}</Text>

        <View style={styles.meta}>
          {article.readTimeMinutes && (
            <Text style={styles.metaText}>{article.readTimeMinutes} min read</Text>
          )}
          {article.categoryName && (
            <Text style={styles.metaText}>{article.categoryName}</Text>
          )}
        </View>

        {article.tags && article.tags.length > 0 && (
          <View style={styles.tags}>
            {article.tags.map((tag, i) => (
              <View key={i} style={[styles.tag, isDark && styles.tagDark]}>
                <Text style={[styles.tagText, isDark && styles.tagTextDark]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {blocks.map((block: any, index: number) => (
          <BlockRenderer key={index} block={block} isDark={isDark} />
        ))}

        <TouchableOpacity
          style={[styles.saveButton, saved && styles.savedButton]}
          onPress={() => {
            if (saved) {
              removeArticle(article.contentId);
            } else {
              saveArticle(article);
            }
          }}
        >
          <Text style={styles.saveButtonText}>
            {saved ? 'Remove from Saved' : 'Save for Offline'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {article.audioUrl && (
        <AudioPlayer
          uri={article.audioUrl}
          title={article.title}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  containerDark: { backgroundColor: '#0A0A0A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 12, lineHeight: 34 },
  textDark: { color: '#F9FAFB' },
  meta: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metaText: { fontSize: 14, color: '#6B7280' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagDark: { backgroundColor: '#1E3A5F' },
  tagText: { fontSize: 12, color: '#2563EB' },
  tagTextDark: { color: '#93C5FD' },
  errorText: { fontSize: 16, color: '#6B7280' },
  saveButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  savedButton: { backgroundColor: '#6B7280' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
