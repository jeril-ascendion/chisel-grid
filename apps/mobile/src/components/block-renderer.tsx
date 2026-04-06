import { View, Text, StyleSheet } from 'react-native';
import type { ContentBlock } from '@chiselgrid/types';

interface BlockRendererProps {
  block: ContentBlock;
  isDark: boolean;
}

export function BlockRenderer({ block, isDark }: BlockRendererProps) {
  switch (block.type) {
    case 'heading':
      return (
        <Text
          style={[
            block.level === 1
              ? styles.h1
              : block.level === 2
                ? styles.h2
                : styles.h3,
            isDark && styles.textDark,
          ]}
        >
          {block.content}
        </Text>
      );

    case 'text':
      return (
        <Text style={[styles.paragraph, isDark && styles.paragraphDark]}>
          {block.content}
        </Text>
      );

    case 'code':
      return (
        <View style={[styles.codeBlock, isDark && styles.codeBlockDark]}>
          {block.filename && (
            <Text style={styles.codeFilename}>{block.filename}</Text>
          )}
          <Text style={[styles.codeText, isDark && styles.codeTextDark]}>
            {block.content}
          </Text>
        </View>
      );

    case 'callout':
      return (
        <View
          style={[
            styles.callout,
            block.variant === 'warning' && styles.calloutWarning,
            block.variant === 'danger' && styles.calloutDanger,
            block.variant === 'success' && styles.calloutSuccess,
            block.variant === 'info' && styles.calloutInfo,
          ]}
        >
          <Text style={styles.calloutLabel}>
            {block.variant === 'warning'
              ? '⚠️ Warning'
              : block.variant === 'danger'
                ? '🚨 Danger'
                : block.variant === 'success'
                  ? '✅ Success'
                  : 'ℹ️ Info'}
          </Text>
          <Text style={styles.calloutText}>{block.content}</Text>
        </View>
      );

    case 'diagram':
      return (
        <View style={[styles.diagramContainer, isDark && styles.diagramDark]}>
          <Text style={[styles.diagramLabel, isDark && styles.textDark]}>
            📊 {block.caption ?? 'Diagram'}
          </Text>
          <Text style={[styles.diagramNote, isDark && styles.subtextDark]}>
            View this diagram in the web version
          </Text>
        </View>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: '#111827', marginVertical: 16, lineHeight: 32 },
  h2: { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 24, marginBottom: 8, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 20, marginBottom: 6, lineHeight: 24 },
  textDark: { color: '#F9FAFB' },
  paragraph: { fontSize: 16, color: '#374151', lineHeight: 26, marginBottom: 12 },
  paragraphDark: { color: '#D1D5DB' },
  codeBlock: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 14,
    marginVertical: 8,
  },
  codeBlockDark: { backgroundColor: '#111827' },
  codeFilename: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  codeText: { fontSize: 13, fontFamily: 'monospace', color: '#E5E7EB', lineHeight: 20 },
  codeTextDark: { color: '#D1D5DB' },
  callout: {
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
  },
  calloutInfo: { backgroundColor: '#EFF6FF', borderLeftColor: '#2563EB' },
  calloutWarning: { backgroundColor: '#FFFBEB', borderLeftColor: '#F59E0B' },
  calloutDanger: { backgroundColor: '#FEF2F2', borderLeftColor: '#EF4444' },
  calloutSuccess: { backgroundColor: '#F0FDF4', borderLeftColor: '#22C55E' },
  calloutLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  calloutText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  diagramContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  diagramDark: { backgroundColor: '#1F2937' },
  diagramLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  diagramNote: { fontSize: 12, color: '#9CA3AF' },
  subtextDark: { color: '#6B7280' },
});
