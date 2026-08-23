/**
 * 앱 설정.
 *
 * 재생 속도·음높이는 여기에 두지 않는다 — 시스템 "글자 읽어주기"(Android) /
 * "콘텐츠 말하기"(iOS) 설정이 유일한 진실의 원천이다. 앱 설정과 곱해져
 * 혼란스러워지는 것을 막기 위해서다. 언어별 목소리만 앱에서 고른다.
 */
import type { ThemeMode } from '@/constants/Colors';
import { createJsonStore } from './jsonStore';

export type AppSettings = {
  /** 화면 모드 — 'system' 이면 기기 설정을 따른다 */
  themeMode: ThemeMode;
  /** 책장에서 접어 둔 레벨 이름 (예: ['Core', 'Elementary']) */
  collapsedLevels: string[];
  /** 한국어 문장에 쓸 목소리 id. null = 자동(시스템 기본) */
  voiceKo: string | null;
  /** 영어 문장에 쓸 목소리 id. null = 자동 */
  voiceEn: string | null;
  /**
   * 오프라인 엔진(Selton) 전용 재생 파라미터 (백분율).
   * 시스템 TTS 와 달리 Flite 는 앱이 합성을 직접 제어하므로 시스템 설정과
   * 곱해지지 않는다 — 그래서 여기서만 예외로 조절값을 둔다.
   */
  fliteRate: number;
  flitePitch: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  collapsedLevels: [],
  voiceKo: null,
  voiceEn: null,
  fliteRate: 100,
  flitePitch: 100,
};

const store = createJsonStore<AppSettings>('settings.json', 'mp-word:settings', DEFAULT_SETTINGS);

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...store.read() };
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch };
  store.write(next);
  return next;
}
