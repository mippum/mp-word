import type { TtsVoice } from '@/lib/tts';

/**
 * Flite(CMU) 오프라인 영어 엔진의 목소리 카탈로그 — 플랫폼 공통.
 *
 * Flite 는 인터넷/시스템 TTS 없이 완전 오프라인으로 동작하는 "최후의 보루" 엔진이다
 * (영어 전용, 한국어 미지원). 앱은 이 목소리를 언어별 목소리 선택(voiceEn)의
 * 특수 값으로 취급한다 — 영어 목소리로 오프라인 항목을 고르면 영어 문장을 Flite 로 읽는다.
 *
 * 목소리는 slt(여성, 16kHz) 하나만 쓴다 — 사용자에게는 'Selton' 으로 보인다.
 * (kal 8kHz 남성은 음질이 거칠어 제외했다.)
 *
 * 시스템 TTS 와 달리 Flite 는 앱이 합성을 직접 제어하므로, Selton 선택 시에는
 * 빠르기/음높이를 앱에서 조절한다 (AppSettings.fliteRate/flitePitch — 합성 시점에 적용).
 */

/** voiceEn 센티넬 접두사 — 이 값이면 Flite 로 라우팅한다 */
export const FLITE_PREFIX = 'flite:';

/** 모듈에 링크된 음성 이름 (build-wasm.sh 의 산출물 이름과 같다) */
export type FliteVoiceKey = 'cmu_us_slt';

export const FLITE_VOICE_ID = {
  slt: `${FLITE_PREFIX}cmu_us_slt`,
} as const;

/** 사용자에게 보이는 이름 (SLT 를 연상시키는 'Selton') */
export const FLITE_VOICE_NAME = 'Selton';

/** 이 목소리 id 가 Flite(오프라인) 엔진 것인지 */
export function isFliteVoiceId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(FLITE_PREFIX);
}

/** `flite:cmu_us_slt` → `cmu_us_slt` (모듈/에셋 선택용). 아니면 null */
export function fliteVoiceKey(id: string | null | undefined): FliteVoiceKey | null {
  if (!isFliteVoiceId(id)) return null;
  const key = (id as string).slice(FLITE_PREFIX.length);
  return key === 'cmu_us_slt' ? key : null;
}

/** 영어 목소리 목록 맨 아래에 붙이는 오프라인 항목 (Selton 하나 — 저음질이라 최후순위) */
export const FLITE_VOICES: TtsVoice[] = [
  {
    id: FLITE_VOICE_ID.slt,
    name: FLITE_VOICE_NAME,
    language: 'en-US',
    quality: '기본',
    network: false,
    offline: true,
  },
];
