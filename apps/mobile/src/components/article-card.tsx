import { View, Text, TouchableOpacity, Image, StyleSheet, useColorScheme } from 'react-native';
import type { Article } from '@/lib/types';

interface ArticleCardProps {
  article: Article;
  onPress: () => void;
  showOfflineBadge?: boolean;
}

export function ArticleCard({ article, onPress, showOfflineBadge }: ArticleCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      style={[styles.card, isDark && styles.cardDark]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {article.heroImageUrl && (
        <Image source={{ uri: article.heroImageUrl }} style={styles.heroImage} />
      )}
      <View style={styles.content}>
        <Text style={[styles.title, isDark && styles.textDark]} numberOfLines={2}>
          {article.title}
        </Text>
        {article.description && (
          <Text style={[styles.description, isDark && styles.subtextDark]} numberOfLines={2}>
            {article.description}
          </Text>
        )}
        <View style={styles.footer}>
          {article.readTimeMinutes && (
            <Text style={styles.footerText}>{article.readTimeMinutes} min read</Text>
          )}
          {article.audioUrl && <Text style={styles.footerText}>🎧 Audio</Text>}
          {showOfflineBadge && <Text style={styles.offlineBadge}>📱 Saved</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1F2937',
    shadowOpacity: 0,
  },
  heroImage: { width: '100%', height: 160 },
  content: { padding: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4, lineHeight: 22 },
  textDark: { color: '#F9FAFB' },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 8 },
  subtextDark: { color: '#9CA3AF' },
  footer: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#9CA3AF' },
  offlineBadge: { fontSize: 12, color: '#10B981' },
});
