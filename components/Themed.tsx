/**
 * 테마를 반영하는 기본 Text / View.
 * 색은 lib/theme.tsx 의 팔레트에서 온다 (화면 모드 = 시스템/밝게/어둡게).
 */
import { Text as DefaultText, View as DefaultView } from 'react-native';

import type { Palette } from '@/constants/Colors';
import { usePalette } from '@/lib/theme';

export type TextProps = DefaultText['props'];
export type ViewProps = DefaultView['props'];

/** 팔레트에서 색 하나를 꺼낸다 */
export function useThemeColor(colorName: keyof Palette): string {
  return usePalette()[colorName];
}

export function Text(props: TextProps) {
  const color = useThemeColor('text');
  return <DefaultText {...props} style={[{ color }, props.style]} />;
}

export function View(props: ViewProps) {
  const backgroundColor = useThemeColor('background');
  return <DefaultView {...props} style={[{ backgroundColor }, props.style]} />;
}
