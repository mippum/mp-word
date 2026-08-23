/**
 * 웹(개발 확인용) TTS 구현 — HTML5 speechSynthesis.
 * Metro 가 웹 번들에서 lib/tts.ts 대신 이 파일을 쓴다. API 는 tts.ts 와 같게 유지할 것.
 *
 * 배포 대상은 네이티브다. 여기서는 엔진 선택이 없고, 목소리 목록도 브라우저가 주는 대로 쓴다.
 */
import type { Utterance } from './script';
import { getSettings } from './settings';
import type { SpeakHandlers, TtsEngine, TtsVoice } from './tts';

export type { SpeakHandlers, TtsEngine, TtsVoice };

type Lang = Utterance['lang'];

const LANGUAGE_TAG: Record<Lang, string> = { en: 'en-US', ko: 'ko-KR' };

export const supportsPause = true;
export const supportsEngineSelection = false;
export const supportsVoiceSelection = true;
export const engineKind: 'system' | 'html5' = 'html5';

function synth(): SpeechSynthesis | null {
  return typeof globalThis !== 'undefined' ? (globalThis.speechSynthesis ?? null) : null;
}

/**
 * 브라우저는 목소리 목록을 비동기로 채운다 — 처음엔 빈 배열이 올 수 있어 한 번 기다린다.
 */
function browserVoices(): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s) return Promise.resolve([]);
  const list = s.getVoices();
  if (list.length > 0) return Promise.resolve(list);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(s.getVoices()), 500);
    s.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(timer);
        resolve(s.getVoices());
      },
      { once: true }
    );
  });
}

export async function voicesForLanguage(lang: Lang): Promise<TtsVoice[]> {
  const list = await browserVoices();
  return list
    .filter((v) => v.lang.toLowerCase().startsWith(lang))
    .map((v) => ({
      id: v.voiceURI,
      name: v.name,
      language: v.lang,
      quality: '기본' as const,
      network: !v.localService,
    }))
    .sort((a, b) => Number(a.network) - Number(b.network) || a.name.localeCompare(b.name));
}

let generation = 0;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;
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

function speakOne(utterance: Utterance, voiceId: string | null): Promise<'done' | 'stopped'> {
  const s = synth();
  if (!s) return Promise.resolve('stopped');
  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: 'done' | 'stopped') => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const u = new SpeechSynthesisUtterance(utterance.text);
    u.lang = LANGUAGE_TAG[utterance.lang];
    if (voiceId) {
      const match = s.getVoices().find((v) => v.voiceURI === voiceId);
      if (match) u.voice = match;
    }
    u.onend = () => settle('done');
    u.onerror = () => settle('stopped');
    s.speak(u);
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

export async function speak(
  utterances: Utterance[],
  fromIndex: number,
  handlers: SpeakHandlers = {}
): Promise<void> {
  await stop();
  const mine = ++generation;
  const start = Math.max(0, Math.min(fromIndex, utterances.length - 1));

  const settings = getSettings();
  const voiceByLang: Record<Lang, string | null> = {
    ko: settings.voiceKo,
    en: settings.voiceEn,
  };

  for (let index = start; index < utterances.length; index += 1) {
    await gate();
    if (generation !== mine) return;

    const utterance = utterances[index];
    handlers.onUtterance?.(index);
    const result = await speakOne(utterance, voiceByLang[utterance.lang]);
    if (generation !== mine || result === 'stopped') return;

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
  releaseGate();
  synth()?.cancel();
}

export async function pause(): Promise<void> {
  paused = true;
  synth()?.pause();
}

export async function resume(): Promise<void> {
  synth()?.resume();
  releaseGate();
}

const PREVIEW_SAMPLES: Record<Lang, string> = {
  ko: '안녕하세요, 이 목소리로 읽어드려요.',
  en: 'I check my schedule every day. Either way, I need water, herbs, and vitamins.',
};

export async function previewVoice(lang: Lang, voiceId: string | null): Promise<void> {
  await stop();
  const s = synth();
  if (!s) return;
  const u = new SpeechSynthesisUtterance(PREVIEW_SAMPLES[lang]);
  u.lang = LANGUAGE_TAG[lang];
  if (voiceId) {
    const match = s.getVoices().find((v) => v.voiceURI === voiceId);
    if (match) u.voice = match;
  }
  s.speak(u);
}

export async function engines(): Promise<TtsEngine[]> {
  return [];
}

export async function syncSystemEngine(): Promise<boolean> {
  return false;
}

export async function openSystemTtsSettings(): Promise<void> {
  throw new Error('Android 에서만 지원합니다');
}
