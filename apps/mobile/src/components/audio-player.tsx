import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Audio, type AVPlaybackStatus } from 'expo-av';

interface AudioPlayerProps {
  uri: string;
  title: string;
}

const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

export function AudioPlayer({ uri, title }: AudioPlayerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1); // Default 1.0x

  useEffect(() => {
    void setupAudio();
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, [uri]);

  async function setupAudio() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false },
      onPlaybackStatusUpdate,
    );
    soundRef.current = sound;
  }

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    setDuration(status.durationMillis ?? 0);
    setIsPlaying(status.isPlaying);
  }

  async function togglePlay() {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }

  async function skipForward() {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(Math.min(position + 15000, duration));
  }

  async function skipBack() {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(Math.max(position - 15000, 0));
  }

  async function cycleSpeed() {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    await soundRef.current?.setRateAsync(PLAYBACK_SPEEDS[nextIndex]!, true);
  }

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.controls}>
        <Text style={[styles.time, isDark && styles.textDark]} numberOfLines={1}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={() => void skipBack()}>
            <Text style={styles.controlText}>⏪ 15</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void togglePlay()}
            style={styles.playButton}
          >
            <Text style={styles.playText}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => void skipForward()}>
            <Text style={styles.controlText}>15 ⏩</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => void cycleSpeed()}>
          <Text style={[styles.speedText, isDark && styles.textDark]}>
            {PLAYBACK_SPEEDS[speedIndex]}x
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 34, // safe area
  },
  containerDark: {
    backgroundColor: '#1F2937',
    borderTopColor: '#374151',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E5E7EB',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  time: { fontSize: 12, color: '#6B7280', width: 80 },
  textDark: { color: '#9CA3AF' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  controlText: { fontSize: 12, color: '#6B7280' },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playText: { fontSize: 18 },
  speedText: { fontSize: 14, fontWeight: '600', color: '#6B7280', width: 40, textAlign: 'right' },
});
