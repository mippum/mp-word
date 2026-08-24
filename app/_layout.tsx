import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { FliteSynthHost } from '@/components/FliteSynthHost';
import { AppThemeProvider, useAppTheme } from '@/lib/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const { scheme, palette } = useAppTheme();

  // 네비게이션 헤더·배경도 앱 팔레트를 따르게 한다 (기본 테마는 회색조가 달라 튄다)
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.background,
      // 네비게이션 헤더 — 본문·탭바보다 한 단계 진하게
      card: palette.header,
      text: palette.text,
      border: palette.border,
      primary: palette.accent,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
          // 기본값이 플랫폼마다 다르다 (Android·웹은 왼쪽) — 가운데로 통일한다
          headerTitleAlign: 'center',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="book/[slug]" options={{ title: '' }} />
        <Stack.Screen name="subscribe" options={{ title: '구독', presentation: 'modal' }} />
      </Stack>
      {/* 오프라인 합성용 숨은 WebView — 앱 루트에 상주해야 한다 */}
      <FliteSynthHost />
    </ThemeProvider>
  );
}
