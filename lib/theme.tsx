import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { Palettes, type Palette, type ThemeMode } from '@/constants/Colors';
import { getSettings, setSettings } from './settings';

/**
 * 화면 모드(시스템/밝게/어둡게)와 팔레트를 앱 전체에 공급한다.
 *
 * 저장은 lib/settings.ts 를 쓰고, getSettings 가 동기라 첫 렌더부터 올바른 모드로 그린다
 * (모드가 늦게 반영되어 화면이 번쩍이는 것을 막는다).
 */
type ThemeContextValue = {
  mode: ThemeMode;
  /** 실제 적용된 모드 — mode 가 'system' 이면 기기 설정을 따른다 */
  scheme: 'light' | 'dark';
  palette: Palette;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(() => normalizeMode(getSettings().themeMode));

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: 'light' | 'dark' = mode === 'system' ? (system ?? 'light') : mode;
    return {
      mode,
      scheme,
      palette: Palettes[scheme],
      setMode: (next) => setModeState(normalizeMode(setSettings({ themeMode: next }).themeMode)),
    };
  }, [mode, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('AppThemeProvider 안에서만 쓸 수 있습니다');
  return value;
}

/** 화면에서 가장 많이 쓰는 형태 — 색만 필요할 때 */
export function usePalette(): Palette {
  return useAppTheme().palette;
}
