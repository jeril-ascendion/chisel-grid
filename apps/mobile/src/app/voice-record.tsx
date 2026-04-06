/**
 * T-16.1: Voice recording screen
 * Mobile screen for recording voice notes that get transcribed into articles.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useAuthStore } from '@/stores/auth-store';

const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID ?? 'default';

export default function VoiceRecordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isAuthenticated } = useAuthStore();

  const handleRecordingComplete = useCallback(
    (recording: {
      uri: string;
      durationMs: number;
      s3Key: string;
      voiceId: string;
    }) => {
      Alert.alert(
        'Voice Note Uploaded',
        'Your recording has been submitted for transcription. You will receive a notification when the draft is ready.',
        [
          {
            text: 'View Status',
            onPress: () =>
              router.push(`/voice-status/${recording.voiceId}` as never),
          },
          { text: 'OK', style: 'cancel' },
        ],
      );
    },
    [],
  );

  const handleError = useCallback((error: Error) => {
    console.error('Voice recording error:', error);
  }, []);

  if (!isAuthenticated) {
    return (
      <View
        style={[styles.container, { backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }]}
      >
        <Text style={[styles.message, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Please log in to record voice notes.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
        Voice Note
      </Text>
      <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Record your thoughts and we'll turn them into a polished article using AI.
      </Text>

      <VoiceRecorder
        tenantId={TENANT_ID}
        onRecordingComplete={handleRecordingComplete}
        onError={handleError}
      />

      <View style={styles.tips}>
        <Text style={[styles.tipsTitle, { color: isDark ? '#D1D5DB' : '#374151' }]}>
          Tips for better results
        </Text>
        <Text style={[styles.tip, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {'\u2022'} Speak clearly at a natural pace
        </Text>
        <Text style={[styles.tip, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {'\u2022'} State your topic at the beginning
        </Text>
        <Text style={[styles.tip, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {'\u2022'} Organize ideas into clear sections
        </Text>
        <Text style={[styles.tip, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {'\u2022'} Mention key terms and names clearly
        </Text>
        <Text style={[styles.tip, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {'\u2022'} Record in a quiet environment
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  tips: {
    padding: 16,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tip: {
    fontSize: 14,
    lineHeight: 24,
  },
});
