import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.center]}>
        <Text style={[styles.title, isDark && styles.textDark]}>Welcome to ChiselGrid</Text>
        <Text style={[styles.subtitle, isDark && styles.subtextDark]}>
          Sign in to access admin features and personalized content.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, isDark && styles.textDark]}>{user?.name ?? 'User'}</Text>
        <Text style={[styles.email, isDark && styles.subtextDark]}>{user?.email}</Text>
        <Text style={[styles.role, isDark && styles.subtextDark]}>
          {user?.role?.toUpperCase()}
        </Text>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  containerDark: { backgroundColor: '#0A0A0A' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  textDark: { color: '#F9FAFB' },
  subtextDark: { color: '#9CA3AF' },
  signInButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  profileSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '600', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  role: { fontSize: 12, color: '#6B7280', marginTop: 4, textTransform: 'uppercase' },
  menuSection: { paddingHorizontal: 16, marginTop: 16 },
  menuItem: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});
