/**
 * TTS 추상화 (네이티브: react-native-tts).
 * 웹(개발 확인용)은 tts.web.ts 의 speechSynthesis 구현으로 대체된다.
 *
 * react-native-tts 를 쓰는 이유: expo-speech 와 달리 Android 에서 TTS 엔진 목록
 * 조회(engines)와 엔진 선택(setDefaultEngine), 목소리 지정(setDefaultVoice)을 지원한다.
 * 대신 네이티브 모듈이므로 **Expo Go 에서는 동작하지 않는다** (개발 빌드 필요).
 *
 * **SSML 을 쓰지 않는다** — 태그 없는 순수 텍스트만 엔진에 넘긴다.
 * 쉼과 철자 낭독은 lib/script.ts 가 미리 대본으로 만들어 둔다.
 *
 * 재생 속도·음높이는 지정하지 않는다 — 시스템 설정을 그대로 따른다.
 * 언어(목소리)만 발화 단위로 전환한다 (설정 탭의 voiceKo/voiceEn, null = 자동).
 *
 * 화면에서 이 모듈을 직접 부르지 말 것. 재생은 항상 lib/player.ts 를 통한다.
 */
import { setAudioModeAsync } from 'expo-audio';
import { Linking, Platform } from 'react-native';
import Tts from 'react-native-tts';

import { flitePlayWav, fliteStopAudio } from './flite/audio.native';
import { fliteSynthWav } from './flite/bridge.native';
import { FLITE_VOICES, fliteVoiceKey } from './flite/voices';
import type { Utterance } from './script';
import { getSettings } from './settings';
import { assignFriendlyNames } from './voiceNames';

type Lang = Utterance['lang'];

const LANGUAGE_TAG: Record<Lang, string> = { en: 'en-US', ko: 'ko-KR' };

export type TtsEngine = { name: string; label: string; isDefault: boolean };

/** 네이티브(발화 중간) 일시정지 지원 여부 — Android 는 미지원 */
export const supportsPause = Platform.OS === 'ios';
/** 시스템 TTS 엔진(목록 / "글자 읽어주기" 설정)은 Android 전용 개념 */
export const supportsEngineSelection = Platform.OS === 'android';
/** 언어별 목소리 선택 — 네이티브(iOS/Android) 지원 */
export const supportsVoiceSelection = true;
/** 이 구현이 쓰는 엔진 종류 — 네이티브는 시스템 TTS, 웹(tts.web.ts)은 HTML5 */
export const engineKind: 'system' | 'html5' = 'system';

// ---------------------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------------------

let initPromise: Promise<unknown> | null = null;

function ensureReady(): Promise<unknown> {
  if (!initPromise) {
    initPromise = Tts.getInitStatus()
      .then(async () => {
        // 백그라운드/화면 꺼짐/무음 스위치 상태에서도 재생이 유지되도록 오디오 세션 설정.
        // 실패해도 포그라운드 재생은 되므로 조용히 무시한다.
        await setAudioModeAsync({
          shouldPlayInBackground: true,
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
        }).catch(() => {});
        // 엔진은 항상 시스템 기본("글자 읽어주기"에서 고른 엔진)을 따른다.
      })
      .catch((e) => {
        initPromise = null; // 다음 호출에서 재시도
        throw e instanceof Error ? e : new Error('TTS 엔진을 초기화하지 못했습니다');
      });
  }
  return initPromise;
}

// ---------------------------------------------------------------------------
// 발화 이벤트 — 한 번에 한 발화만 큐에 넣고 tts-finish 를 기다린다
// ---------------------------------------------------------------------------

type Settle = (result: 'done' | 'stopped') => void;

/** 지금 재생 중인 발화의 완료 대기 resolver */
let pending: Settle | null = null;

function settle(result: 'done' | 'stopped') {
  const resolve = pending;
  pending = null;
  resolve?.(result);
}

Tts.addEventListener('tts-finish', () => settle('done'));
Tts.addEventListener('tts-cancel', () => settle('stopped'));
Tts.addEventListener('tts-error', () => settle('stopped'));

// ---------------------------------------------------------------------------
// 목소리
// ---------------------------------------------------------------------------

type NativeVoice = {
  id: string;
  name: string;
  language: string;
  quality?: number;
  notInstalled?: boolean;
  networkConnectionRequired?: boolean;
};

/** iOS 영어 목소리 id 캐시 — undefined: 미조회, null: 쓸 목소리 없음 */
let iosEnglishVoiceId: string | null | undefined;

/**
 * 영어 목소리 후보 점수 — 높을수록 자연스러운 목소리.
 * iOS 목록에는 접근성용 Eloquence 계열과 노벨티 음성 같은 "로봇 목소리"가 섞여 있어
 * id 로 걸러낸다. 품질도 quality 필드(react-native-tts 는 premium 을 구분 못 함) 대신
 * id 의 .premium. / .enhanced. / .compact. 표기를 우선 본다.
 */
function iosEnglishVoiceScore(v: NativeVoice): number {
  const id = v.id;
  if (id.startsWith('com.apple.eloquence.') || id.startsWith('com.apple.speech.synthesis.voice.')) {
    return -1;
  }
  let score = 0;
  if (v.language === 'en-US') score += 100;
  if (id.includes('.premium.')) score += 30;
  else if (id.includes('.enhanced.') || v.quality === 500) score += 20;
  else if (id.includes('.compact.') || id.includes('ttsbundle')) score += 10;
  return score;
}

async function findIosEnglishVoiceId(): Promise<string | null> {
  if (iosEnglishVoiceId !== undefined) return iosEnglishVoiceId;
  try {
    const voices = (await Tts.voices()) as NativeVoice[];
    const candidates = voices
      .filter((v) => v.language?.startsWith('en') && !v.notInstalled && !v.networkConnectionRequired)
      .map((v) => ({ v, score: iosEnglishVoiceScore(v) }))
      .filter((c) => c.score >= 0)
      .sort((a, b) => b.score - a.score);
    iosEnglishVoiceId = candidates[0]?.v.id ?? null;
  } catch {
    iosEnglishVoiceId = null;
  }
  return iosEnglishVoiceId;
}

/** 설정 화면의 목소리 목록 항목 */
export type TtsVoice = {
  id: string;
  name: string;
  language: string;
  /** 표시용 품질 (iOS: id 표기 기반, Android: quality 필드 기반) */
  quality: '프리미엄' | '향상' | '기본';
  /** 인터넷 연결이 필요한 목소리 (Android network 목소리) */
  network: boolean;
  /** 앱에 번들된 오프라인 엔진(Flite) 목소리 — 시스템/인터넷 없이 동작 */
  offline?: boolean;
};

function iosVoiceQuality(v: NativeVoice): TtsVoice['quality'] {
  if (v.id.includes('.premium.')) return '프리미엄';
  if (v.id.includes('.enhanced.') || v.quality === 500) return '향상';
  return '기본';
}

/** Android Voice.QUALITY_VERY_HIGH=500 / HIGH=400 기준 표시용 품질 */
function androidVoiceQuality(quality: number | undefined): TtsVoice['quality'] {
  if ((quality ?? 0) >= 500) return '프리미엄';
  if ((quality ?? 0) >= 400) return '향상';
  return '기본';
}

const QUALITY_RANK: Record<TtsVoice['quality'], number> = { 프리미엄: 2, 향상: 1, 기본: 0 };

/**
 * 언어별 목소리 선택 목록.
 * - iOS: Eloquence/노벨티 같은 로봇 목소리 계열은 제외
 * - Android: 현재 시스템 엔진의 목소리 (network 목소리도 품질이 좋아 포함).
 *   Android 는 목소리에 표시 이름이 없어 id 대신 정해둔 이름을 붙인다
 * 품질 높은 순 → 이름순, 인터넷 필요 목소리는 맨 아래.
 */
export async function voicesForLanguage(lang: Lang): Promise<TtsVoice[]> {
  await ensureReady();
  const voices = (await Tts.voices()) as NativeVoice[];
  // 지역 구분 없이 언어(ko/en)로만 필터 — ko-KR, en-US/en-GB/en-AU 등 모두 포함
  const filtered =
    Platform.OS === 'android'
      ? voices.filter((v) => (v.language ?? '').toLowerCase().startsWith(lang) && !v.notInstalled)
      : voices.filter(
          (v) =>
            v.language?.startsWith(lang) &&
            !v.notInstalled &&
            !v.networkConnectionRequired &&
            !v.id.startsWith('com.apple.eloquence.') &&
            !v.id.startsWith('com.apple.speech.synthesis.voice.')
        );
  const mapped = filtered.map((v) => ({
    id: v.id,
    name: v.name || v.id,
    language: v.language,
    quality: Platform.OS === 'android' ? androidVoiceQuality(v.quality) : iosVoiceQuality(v),
    network: !!v.networkConnectionRequired,
  }));
  const named = Platform.OS === 'android' ? assignFriendlyNames(mapped, lang) : mapped;
  const sorted = named.sort(
    (a, b) =>
      Number(a.network) - Number(b.network) ||
      QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality] ||
      a.name.localeCompare(b.name)
  );
  // 오프라인 항목(Selton)은 저음질이라 목록 **맨 아래**에 둔다 —
  // 시스템 TTS 를 쓸 수 없을 때만 고르는 최후의 보루다 (인터넷 필요 목소리보다도 아래).
  // 오프라인 엔진은 영어(Flite)뿐이라 한국어는 항상 시스템 TTS 로 읽는다.
  if (lang === 'en') return [...sorted, ...FLITE_VOICES];
  return sorted;
}

// ---------------------------------------------------------------------------
// 재생
// ---------------------------------------------------------------------------

export type SpeakHandlers = {
  /** 발화가 하나 시작될 때마다 (대본 안에서의 인덱스) */
  onUtterance?: (index: number) => void;
  /** 대본을 끝까지 읽었을 때 */
  onDone?: () => void;
  onError?: (message: string) => void;
};

/**
 * 재생 세대. stop() 이나 새 speak() 가 이 값을 올리면 진행 중이던 순차 재생 루프는
 * 자기 세대가 아님을 보고 조용히 빠져나간다.
 */
let generation = 0;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 일시정지 게이트.
 * 엔진이 읽는 중에 pause() 하면 완료 이벤트가 오지 않아 루프가 저절로 멈추지만,
 * 발화 **사이의 쉼** 중에 pause() 하면 엔진은 놀고 있어서 루프가 다음 발화로
 * 넘어가 버린다. 그래서 발화를 시작하기 전에 항상 이 게이트를 통과시킨다.
 */
let paused = false;
let resumeWaiters: (() => void)[] = [];

function gate(): Promise<void> {
  if (!paused) return Promise.resolve();
  return new Promise((resolve) => {
    resumeWaiters.push(resolve);
  });
}

function releaseGate() {
  paused = false;
  const waiters = resumeWaiters;
  resumeWaiters = [];
  waiters.forEach((resolve) => resolve());
}

function clearPauseTimer() {
  if (pauseTimer) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
  }
}

/** 이번 재생에서 쓸 언어별 목소리 (speak() 시작 시 설정에서 읽는다) */
let voiceByLang: Record<Lang, string | null> = { ko: null, en: null };
/** Android 엔진에 마지막으로 적용한 언어 — null 이면 아직 적용 전 */
let androidAppliedLang: Lang | null = null;

/**
 * Android 는 발화별 목소리 지정이 없어, 언어가 바뀔 때 기본 목소리/언어를 바꾼다.
 * (iOS 는 speak 의 두 번째 인자로 발화별 iosVoiceId 를 넘길 수 있다)
 */
async function applyAndroidLanguage(lang: Lang): Promise<void> {
  if (lang === androidAppliedLang) return;
  const voice = voiceByLang[lang];
  try {
    if (voice) {
      // 목소리에 언어가 포함되므로 언어 전환도 함께 된다
      await Tts.setDefaultVoice(voice);
    } else {
      await Tts.setDefaultLanguage(LANGUAGE_TAG[lang]);
    }
    androidAppliedLang = lang;
  } catch {
    // 목소리/언어 적용 실패 (엔진 미지원, 목소리 삭제 등) — 언어 전환만이라도 시도
    try {
      await Tts.setDefaultLanguage(LANGUAGE_TAG[lang]);
      androidAppliedLang = lang;
    } catch {
      // 그것도 안 되면 현재 목소리로 계속 읽는다
    }
  }
}

/**
 * 이번 재생의 오프라인 엔진 설정.
 * 영어 목소리로 Selton(flite:)을 고르면 영어 발화만 오프라인 합성으로 읽고,
 * 나머지(한국어 포함)는 시스템 TTS 로 읽는다.
 */
type OfflinePlan = {
  fliteKey: ReturnType<typeof fliteVoiceKey>;
  rate: number;
  pitch: number;
};

function offlinePlan(): OfflinePlan {
  const s = getSettings();
  return {
    fliteKey: fliteVoiceKey(s.voiceEn),
    rate: (s.fliteRate ?? 100) / 100,
    pitch: (s.flitePitch ?? 100) / 100,
  };
}

/**
 * 오프라인 엔진으로 발화 하나를 합성해 재생한다 (대상이 아니면 false).
 * 합성은 숨은 WebView(Hermes 가 WASM 을 못 돌린다), 재생은 expo-audio 가 맡는다.
 */
async function speakOneOffline(utterance: Utterance, plan: OfflinePlan): Promise<boolean> {
  if (utterance.lang === 'en' && plan.fliteKey) {
    const { base64 } = await fliteSynthWav(plan.fliteKey, utterance.text, plan.rate, plan.pitch);
    await flitePlayWav(base64);
    return true;
  }
  return false;
}

/** 발화 하나 — 완료/취소 이벤트가 올 때까지 기다린다 */
function speakOne(utterance: Utterance, iosVoice: string | null): Promise<'done' | 'stopped'> {
  return new Promise((resolve) => {
    pending = resolve;
    if (Platform.OS === 'ios' && iosVoice) {
      // 두 번째 인자(문자열)는 iOS 에서 발화별 iosVoiceId 로 전달된다
      Tts.speak(utterance.text, iosVoice);
    } else {
      Tts.speak(utterance.text);
    }
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      resolve();
    }, ms);
  });
}

/**
 * 대본을 fromIndex 부터 순서대로 읽는다. 이미 재생 중이면 멈추고 새로 시작한다.
 *
 * 발화 사이에 실제로 쉬어야 하므로(SSML break 대체) iOS 에서도 큐에 한꺼번에 넣지 않고
 * 한 발화씩 순차로 재생한다.
 */
export async function speak(
  utterances: Utterance[],
  fromIndex: number,
  handlers: SpeakHandlers = {}
): Promise<void> {
  await stop();
  try {
    await ensureReady();
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e.message : 'TTS 엔진을 초기화하지 못했습니다');
    return;
  }

  const mine = ++generation;
  const start = Math.max(0, Math.min(fromIndex, utterances.length - 1));

  // 설정 탭에서 고른 목소리를 이번 재생에 적용 (재생 사이에 바뀔 수 있어 매번 읽는다)
  const settings = getSettings();
  voiceByLang = { ko: settings.voiceKo, en: settings.voiceEn };
  androidAppliedLang = null;
  // iOS 영어는 미선택 시 자동 선택, 한국어는 시스템 기본을 그대로 둔다
  const iosVoiceByLang: Record<Lang, string | null> = {
    ko: settings.voiceKo,
    en: settings.voiceEn ?? (Platform.OS === 'ios' ? await findIosEnglishVoiceId() : null),
  };
  if (generation !== mine) return;

  const plan = offlinePlan();

  for (let index = start; index < utterances.length; index += 1) {
    await gate();
    if (generation !== mine) return;

    const utterance = utterances[index];
    handlers.onUtterance?.(index);

    try {
      if (await speakOneOffline(utterance, plan)) {
        if (generation !== mine) return;
      } else {
        if (Platform.OS === 'android') await applyAndroidLanguage(utterance.lang);
        if (generation !== mine) return;
        const result = await speakOne(utterance, iosVoiceByLang[utterance.lang]);
        if (generation !== mine || result === 'stopped') return;
      }
    } catch (e) {
      if (generation !== mine) return; // 중단으로 인한 오류는 무시
      handlers.onError?.(e instanceof Error ? e.message : '재생 중 오류가 발생했습니다');
      return;
    }

    // SSML break 대신 실제로 쉰다 (마지막 발화 뒤에는 쉬지 않는다)
    if (utterance.pauseAfterMs > 0 && index < utterances.length - 1) {
      await wait(utterance.pauseAfterMs);
      if (generation !== mine) return;
    }
  }

  if (generation === mine) handlers.onDone?.();
}

export async function stop(): Promise<void> {
  generation += 1;
  clearPauseTimer();
  // 게이트에 걸려 있던 루프도 깨워야 자기 세대가 아님을 보고 빠져나간다
  releaseGate();
  settle('stopped');
  fliteStopAudio();
  try {
    await Tts.stop();
  } catch {
    // 재생 중이 아니면 엔진이 오류를 낼 수 있다 — 무시한다
  }
}

/** iOS·웹 전용. Android 에서는 호출하지 말 것 (supportsPause 로 분기) */
export async function pause(): Promise<void> {
  paused = true;
  await Tts.pause();
}

export async function resume(): Promise<void> {
  await Tts.resume();
  releaseGate();
}

// ---------------------------------------------------------------------------
// 미리듣기
// ---------------------------------------------------------------------------

const PREVIEW_SAMPLES: Record<Lang, string> = {
  ko: '안녕하세요, 이 목소리로 읽어드려요.',
  // 미국식/영국식 발음이 뚜렷이 갈리는 단어들 (schedule, either, water, herb, vitamin)
  en: 'I check my schedule every day. Either way, I need water, herbs, and vitamins.',
};

/**
 * 설정 화면 목소리 미리듣기 — 짧은 샘플 한 문장을 그 목소리로 재생한다.
 * 진행 중이던 재생 정지는 호출측(player)이 담당한다.
 */
export async function previewVoice(lang: Lang, voiceId: string | null): Promise<void> {
  await ensureReady();
  await stop();
  const sample = PREVIEW_SAMPLES[lang];

  // 오프라인 목소리 미리듣기 — 현재 설정의 빠르기/음높이를 반영해 조절 결과를 바로 들려준다
  const settings = getSettings();
  const fliteKey = fliteVoiceKey(voiceId);
  if (fliteKey) {
    const { base64 } = await fliteSynthWav(
      fliteKey,
      sample,
      (settings.fliteRate ?? 100) / 100,
      (settings.flitePitch ?? 100) / 100
    );
    await flitePlayWav(base64);
    return;
  }
  if (Platform.OS === 'android') {
    try {
      if (voiceId) await Tts.setDefaultVoice(voiceId);
      else await Tts.setDefaultLanguage(LANGUAGE_TAG[lang]);
    } catch {
      // 적용 실패 시 현재 목소리로라도 샘플을 들려준다
    }
    // 다음 실제 재생이 언어/목소리를 처음부터 다시 적용하도록 리셋
    androidAppliedLang = null;
    Tts.speak(sample);
    return;
  }

  // iOS: "자동" 미리듣기도 실제 재생과 같은 규칙 (ko = 시스템 기본, en = 자동 선택)
  const voice = voiceId ?? (lang === 'en' ? await findIosEnglishVoiceId() : null);
  if (voice) Tts.speak(sample, voice);
  else Tts.speak(sample);
}

// ---------------------------------------------------------------------------
// 엔진 (Android)
// ---------------------------------------------------------------------------

export async function engines(): Promise<TtsEngine[]> {
  if (!supportsEngineSelection) return [];
  await ensureReady();
  const list = (await Tts.engines()) as { name: string; label?: string; default?: boolean }[];
  return list.map((e) => ({ name: e.name, label: e.label || e.name, isDefault: !!e.default }));
}

let appliedEngine: string | null = null;

/**
 * Android: 시스템 기본 엔진("글자 읽어주기"에서 고른 엔진)을 앱에 다시 적용한다.
 * 시스템 설정에서 엔진을 바꾸고 돌아와도 이미 초기화된 TTS 인스턴스는 예전 엔진에
 * 묶여 있으므로, 설정 화면 진입 시 호출해 동기화한다. 엔진이 바뀌었으면 true.
 */
export async function syncSystemEngine(): Promise<boolean> {
  if (!supportsEngineSelection) return false;
  await ensureReady();
  const list = await engines();
  const systemDefault = list.find((e) => e.isDefault)?.name;
  if (!systemDefault || systemDefault === appliedEngine) return false;
  await Tts.setDefaultEngine(systemDefault);
  const changed = appliedEngine !== null; // 첫 호출은 초기 적용이라 "변경"이 아님
  appliedEngine = systemDefault;
  return changed;
}

/** Android 시스템 "글자 읽어주기"(TTS 출력) 설정 화면을 연다. */
export async function openSystemTtsSettings(): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('Android 에서만 지원합니다');
  await Linking.sendIntent('com.android.settings.TTS_SETTINGS');
}
