import { ScrollView, TouchableOpacity, Text, StyleSheet, useColorScheme } from 'react-native';
import type { Category } from '@/lib/types';

interface CategoryTabsProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.tab,
          isDark && styles.tabDark,
          !selected && styles.tabActive,
        ]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.tabText, !selected && styles.tabTextActive, isDark && styles.textDark]}>
          All
        </Text>
      </TouchableOpacity>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.categoryId}
          style={[
            styles.tab,
            isDark && styles.tabDark,
            selected === cat.categoryId && styles.tabActive,
          ]}
          onPress={() => onSelect(cat.categoryId)}
        >
          <Text
            style={[
              styles.tabText,
              selected === cat.categoryId && styles.tabTextActive,
              isDark && styles.textDark,
            ]}
          >
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabDark: { backgroundColor: '#1F2937' },
  tabActive: { backgroundColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },
  textDark: { color: '#D1D5DB' },
});
