/**
 * 앱 설정.
 *
 * 재생 속도·음높이는 여기에 두지 않는다 — 시스템 "글자 읽어주기"(Android) /
 * "콘텐츠 말하기"(iOS) 설정이 유일한 진실의 원천이다. 앱 설정과 곱해져
 * 혼란스러워지는 것을 막기 위해서다. 언어별 목소리만 앱에서 고른다.
 */
import { createJsonStore } from './jsonStore';

export type AppSettings = {
  /** 한국어 문장에 쓸 목소리 id. null = 자동(시스템 기본) */
  voiceKo: string | null;
  /** 영어 문장에 쓸 목소리 id. null = 자동 */
  voiceEn: string | null;
};

export const DEFAULT_SETTINGS: AppSettings = {
  voiceKo: null,
  voiceEn: null,
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
