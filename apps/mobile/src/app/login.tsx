import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    const success = await login();
    if (success) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.content}>
        <Text style={[styles.logo, isDark && styles.textDark]}>ChiselGrid</Text>
        <Text style={[styles.subtitle, isDark && styles.subtextDark]}>
          Sign in with your Ascendion account
        </Text>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={() => void handleLogin()}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In with SSO</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
          <Text style={[styles.skipText, isDark && styles.subtextDark]}>
            Continue as Guest
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  containerDark: { backgroundColor: '#0A0A0A' },
  content: { padding: 32, alignItems: 'center' },
  logo: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32, textAlign: 'center' },
  textDark: { color: '#F9FAFB' },
  subtextDark: { color: '#9CA3AF' },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  skipButton: { paddingVertical: 12 },
  skipText: { color: '#6B7280', fontSize: 14 },
});
