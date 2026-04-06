import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
          },
          headerTintColor: isDark ? '#FFFFFF' : '#0A0A0A',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="article/[slug]"
          options={{ title: '', headerBackTitle: 'Back' }}
        />
        <Stack.Screen name="login" options={{ title: 'Sign In', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
