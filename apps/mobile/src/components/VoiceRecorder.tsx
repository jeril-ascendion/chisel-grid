/**
 * T-16.1: Mobile voice recording component
 * Uses expo-av for high-quality audio recording.
 * Records M4A on iOS, AAC on Android. Maximum quality settings.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  useColorScheme,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ascendion.engineering';

interface VoiceRecorderProps {
  tenantId: string;
  onRecordingComplete: (recording: {
    uri: string;
    durationMs: number;
    s3Key: string;
    voiceId: string;
  }) => void;
  onError?: (error: Error) => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'uploading';

export function VoiceRecorder({
  tenantId,
  onRecordingComplete,
  onError,
}: VoiceRecorderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [state, setState] = useState<RecordingState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pulse animation while recording
  useEffect(() => {
    if (state === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [state, pulseAnim]);

  // Duration timer
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = setInterval(() => {
        setDurationMs((prev) => prev + 1000);
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, [state]);

  const formatDuration = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone access is needed to record voice notes.',
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/mp4',
          bitsPerSecond: 128000,
        },
      };

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      recordingRef.current = recording;
      setDurationMs(0);
      setState('recording');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      Alert.alert('Recording Error', error.message);
    }
  }, [onError]);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.pauseAsync();
      setState('paused');
    } catch (err) {
      console.error('Failed to pause recording:', err);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.startAsync();
      setState('recording');
    } catch (err) {
      console.error('Failed to resume recording:', err);
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No recording URI available');
      }

      setState('uploading');
      setUploadProgress(0);

      // Step 1: Get presigned URL from API
      const token = await SecureStore.getItemAsync('auth_token');
      const presignResponse = await fetch(
        `${API_BASE_URL}/api/voice/presign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            tenantId,
            fileExtension: '.m4a',
            contentType: 'audio/mp4',
          }),
        },
      );

      if (!presignResponse.ok) {
        throw new Error(`Presign failed: ${presignResponse.status}`);
      }

      const { uploadUrl, s3Key, voiceId } = (await presignResponse.json()) as {
        uploadUrl: string;
        s3Key: string;
        voiceId: string;
      };

      setUploadProgress(0.2);

      // Step 2: Upload file to S3 via presigned URL
      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();

      setUploadProgress(0.5);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'audio/mp4',
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      setUploadProgress(1.0);

      // Step 3: Notify API that upload is complete (triggers transcription)
      await fetch(`${API_BASE_URL}/api/voice/uploaded`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tenantId, voiceId, s3Key, durationMs }),
      });

      setState('idle');
      setDurationMs(0);

      onRecordingComplete({ uri, durationMs, s3Key, voiceId });
    } catch (err) {
      setState('idle');
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      Alert.alert('Upload Error', error.message);
    }
  }, [tenantId, durationMs, onRecordingComplete, onError]);

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // ignore cleanup errors
      }
      recordingRef.current = null;
    }
    setState('idle');
    setDurationMs(0);
  }, []);

  const styles = getStyles(isDark);

  return (
    <View style={styles.container}>
      {/* Duration display */}
      <Text style={styles.duration}>{formatDuration(durationMs)}</Text>

      {/* Status text */}
      <Text style={styles.status}>
        {state === 'idle' && 'Tap to start recording'}
        {state === 'recording' && 'Recording...'}
        {state === 'paused' && 'Paused'}
        {state === 'uploading' &&
          `Uploading... ${Math.round(uploadProgress * 100)}%`}
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        {state === 'idle' && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={startRecording}
            accessibilityLabel="Start recording"
            accessibilityRole="button"
          >
            <Animated.View
              style={[
                styles.recordDot,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
          </TouchableOpacity>
        )}

        {state === 'recording' && (
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={pauseRecording}
              accessibilityLabel="Pause recording"
            >
              <Text style={styles.controlIcon}>⏸</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopAndUpload}
              accessibilityLabel="Stop and upload"
            >
              <View style={styles.stopDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={cancelRecording}
              accessibilityLabel="Cancel recording"
            >
              <Text style={styles.controlIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'paused' && (
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={resumeRecording}
              accessibilityLabel="Resume recording"
            >
              <Text style={styles.controlIcon}>▶</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopAndUpload}
              accessibilityLabel="Stop and upload"
            >
              <View style={styles.stopDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={cancelRecording}
              accessibilityLabel="Cancel recording"
            >
              <Text style={styles.controlIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'uploading' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${uploadProgress * 100}%` },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      padding: 24,
      backgroundColor: isDark ? '#111827' : '#F9FAFB',
      borderRadius: 16,
      margin: 16,
    },
    duration: {
      fontSize: 48,
      fontWeight: '300',
      fontVariant: ['tabular-nums'],
      color: isDark ? '#F9FAFB' : '#111827',
      marginBottom: 8,
    },
    status: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 24,
    },
    controls: {
      alignItems: 'center',
    },
    recordButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EF4444',
    },
    activeControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
    },
    controlButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlIcon: {
      fontSize: 20,
      color: isDark ? '#F9FAFB' : '#111827',
    },
    stopButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#EF4444',
    },
    stopDot: {
      width: 24,
      height: 24,
      borderRadius: 4,
      backgroundColor: '#FFFFFF',
    },
    progressContainer: {
      width: '100%',
      paddingHorizontal: 16,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#374151' : '#D1D5DB',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: '#2563EB',
    },
  });
}
