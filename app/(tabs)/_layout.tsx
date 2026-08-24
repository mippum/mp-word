import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { usePalette } from '@/lib/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const palette = usePalette();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tabIconSelected,
        tabBarInactiveTintColor: palette.tabIconDefault,
        // 위아래 바는 본문보다 진하게 — 한 덩어리로 보이지 않게 한다.
        // 헤더는 그보다 한 단계 더 준다
        tabBarStyle: { backgroundColor: palette.chrome, borderTopColor: palette.border },
        headerStyle: { backgroundColor: palette.header },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '700' },
        // 기본값이 플랫폼마다 다르다 (Android·웹은 왼쪽) — 가운데로 통일한다
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: palette.background },
        // 웹에서 헤더를 정적 렌더링하면 하이드레이션 오류가 나므로 클라이언트에서만 켠다
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '읽기',
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: '더보기',
          tabBarIcon: ({ color }) => <TabBarIcon name="ellipsis-h" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
