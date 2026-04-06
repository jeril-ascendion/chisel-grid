/**
 * T-19.2: Guided Interview Recording UI
 *
 * Mobile screen that shows a Q&A flow for structured interviews.
 * - One question at a time with progress bar
 * - Tap to record answer for each question
 * - Skip option for questions
 * - Upload all answers together with interview metadata
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  useColorScheme,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ascendion.engineering';

interface InterviewQuestion {
  id: string;
  text: string;
  followUp?: string;
  expectedDuration: number; // seconds
}

interface InterviewTemplate {
  templateId: string;
  name: string;
  questions: InterviewQuestion[];
  category: string;
}

interface RecordedAnswer {
  questionId: string;
  uri: string;
  durationMs: number;
  skipped: boolean;
}

interface InterviewRecorderProps {
  tenantId: string;
  template: InterviewTemplate;
  onComplete: (result: {
    templateId: string;
    answers: RecordedAnswer[];
    interviewId: string;
  }) => void;
  onCancel: () => void;
}

export function InterviewRecorder({
  tenantId,
  template,
  onComplete,
  onCancel,
}: InterviewRecorderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [answers, setAnswers] = useState<RecordedAnswer[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentQuestion = template.questions[currentIndex];
  const progress = (currentIndex / template.questions.length) * 100;
  const isLastQuestion = currentIndex === template.questions.length - 1;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Microphone access is needed for recording.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Platform.OS === 'ios'
          ? Audio.RecordingOptionsPresets.HIGH_QUALITY
          : {
              ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
              android: {
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                extension: '.aac',
                outputFormat: 2, // AAC_ADTS
                audioEncoder: 3, // AAC
              },
            },
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      startPulse();

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }, [startPulse]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    stopPulse();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const status = await recordingRef.current.getStatusAsync();
      const durationMs = status.durationMillis ?? 0;

      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        const answer: RecordedAnswer = {
          questionId: currentQuestion.id,
          uri,
          durationMs,
          skipped: false,
        };
        setAnswers((prev) => [...prev, answer]);

        // Show follow-up if available
        if (currentQuestion.followUp && !showFollowUp) {
          setShowFollowUp(true);
        } else {
          advanceToNext();
        }
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setIsRecording(false);
    }
  }, [currentQuestion, showFollowUp, stopPulse]);

  const skipQuestion = useCallback(() => {
    const answer: RecordedAnswer = {
      questionId: currentQuestion.id,
      uri: '',
      durationMs: 0,
      skipped: true,
    };
    setAnswers((prev) => [...prev, answer]);
    advanceToNext();
  }, [currentQuestion]);

  const advanceToNext = useCallback(() => {
    setShowFollowUp(false);
    setRecordingDuration(0);

    if (isLastQuestion) {
      uploadAllAnswers();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastQuestion]);

  const uploadAllAnswers = useCallback(async () => {
    setIsUploading(true);

    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const interviewId = `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Upload each non-skipped answer
      const uploadedAnswers: RecordedAnswer[] = [];

      for (const answer of answers) {
        if (answer.skipped) {
          uploadedAnswers.push(answer);
          continue;
        }

        // Get presigned URL
        const presignRes = await fetch(`${API_BASE_URL}/upload/presign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tenantId,
            fileName: `interview-${interviewId}-${answer.questionId}.${Platform.OS === 'ios' ? 'm4a' : 'aac'}`,
            contentType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/aac',
            prefix: `voice/interviews/${interviewId}`,
          }),
        });

        const { uploadUrl, s3Key } = await presignRes.json();

        // Upload file
        const fileRes = await fetch(answer.uri);
        const blob = await fileRes.blob();
        await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': Platform.OS === 'ios' ? 'audio/m4a' : 'audio/aac' },
        });

        uploadedAnswers.push({ ...answer, uri: s3Key });
      }

      // Submit interview metadata
      await fetch(`${API_BASE_URL}/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interviewId,
          tenantId,
          templateId: template.templateId,
          templateName: template.name,
          category: template.category,
          answers: uploadedAnswers.map((a) => ({
            questionId: a.questionId,
            s3Key: a.skipped ? null : a.uri,
            durationMs: a.durationMs,
            skipped: a.skipped,
          })),
        }),
      });

      onComplete({
        templateId: template.templateId,
        answers: uploadedAnswers,
        interviewId,
      });
    } catch (err) {
      console.error('Upload failed:', err);
      Alert.alert('Upload Error', 'Failed to upload answers. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [answers, tenantId, template, onComplete]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (isUploading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={[styles.uploadingText, isDark && styles.textDark]}>
          Uploading your answers...
        </Text>
        <Text style={[styles.uploadingSubtext, isDark && styles.textMuted]}>
          {answers.filter((a) => !a.skipped).length} recordings being processed
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.templateName, isDark && styles.textDark]} numberOfLines={1}>
          {template.name}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, isDark && styles.progressBarDark]}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={[styles.progressText, isDark && styles.textMuted]}>
          Question {currentIndex + 1} of {template.questions.length}
        </Text>
      </View>

      {/* Question Display */}
      <ScrollView style={styles.questionArea} contentContainerStyle={styles.questionContent}>
        <Text style={[styles.questionNumber, isDark && styles.textMuted]}>
          Q{currentIndex + 1}
        </Text>
        <Text style={[styles.questionText, isDark && styles.textDark]}>
          {showFollowUp && currentQuestion.followUp
            ? currentQuestion.followUp
            : currentQuestion.text}
        </Text>
        {showFollowUp && (
          <Text style={[styles.followUpLabel, isDark && styles.textMuted]}>Follow-up question</Text>
        )}
        <Text style={[styles.expectedDuration, isDark && styles.textMuted]}>
          Expected: ~{formatTime(currentQuestion.expectedDuration)}
        </Text>
      </ScrollView>

      {/* Recording Controls */}
      <View style={styles.controls}>
        {isRecording && (
          <Text style={styles.recordingTimer}>{formatTime(recordingDuration)}</Text>
        )}

        <View style={styles.buttonRow}>
          {/* Skip Button */}
          {!isRecording && (
            <TouchableOpacity onPress={skipQuestion} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}

          {/* Record / Stop Button */}
          <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={[
                styles.recordBtn,
                isRecording && styles.recordBtnActive,
              ]}
            >
              <View style={[
                styles.recordBtnInner,
                isRecording && styles.recordBtnInnerActive,
              ]} />
            </TouchableOpacity>
          </Animated.View>

          {/* Spacer to balance skip button */}
          {!isRecording && <View style={styles.skipBtn} />}
        </View>

        <Text style={[styles.recordHint, isDark && styles.textMuted]}>
          {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
        </Text>
      </View>

      {/* Answer Summary */}
      <View style={[styles.summaryBar, isDark && styles.summaryBarDark]}>
        <Text style={[styles.summaryText, isDark && styles.textMuted]}>
          {answers.filter((a) => !a.skipped).length} recorded · {answers.filter((a) => a.skipped).length} skipped
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
  },
  cancelBtn: {
    width: 70,
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 70,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarDark: {
    backgroundColor: '#334155',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  questionArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  questionContent: {
    paddingTop: 32,
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 12,
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 16,
  },
  followUpLabel: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  expectedDuration: {
    fontSize: 13,
    color: '#94a3b8',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  recordingTimer: {
    fontSize: 32,
    fontWeight: '300',
    color: '#ef4444',
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 12,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordBtnActive: {
    borderColor: '#ef4444',
  },
  recordBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
  },
  recordBtnInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  skipBtn: {
    width: 60,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  recordHint: {
    fontSize: 13,
    color: '#94a3b8',
  },
  summaryBar: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  summaryBarDark: {
    borderTopColor: '#334155',
  },
  summaryText: {
    fontSize: 13,
    color: '#64748b',
  },
  uploadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 24,
    textAlign: 'center',
  },
  uploadingSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  textDark: {
    color: '#f1f5f9',
  },
  textMuted: {
    color: '#64748b',
  },
});

export default InterviewRecorder;
