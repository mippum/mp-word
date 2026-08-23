import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type WebView from 'react-native-webview';

import type { FliteVoiceKey } from './voices';

/**
 * 네이티브 Flite 합성 브리지 — 숨은 WebView(FliteSynthHost)와 대화한다.
 *
 * Hermes 는 WASM 을 못 돌리므로, 합성은 WebView 안에서 하고 결과 WAV(base64)만 받는다.
 * glue(.js)/wasm 은 앱에 번들된 에셋을 읽어 WebView 로 주입한다 (webviewHtml.ts 의 프로토콜).
 * 재생은 이 모듈이 아니라 audio.native.ts(expo-audio)가 맡는다 — 백그라운드 유지를 위해.
 */

// ── WebView 등록 (FliteSynthHost 가 마운트 시 넘겨준다) ──
let webview: WebView | null = null;

export function registerFliteWebView(ref: WebView | null): void {
  webview = ref;
}

function inject(js: string): void {
  if (!webview) throw new Error('Flite 합성기(WebView)가 아직 준비되지 않았습니다');
  // injectJavaScript 는 마지막 표현식이 true 여야 경고가 없다
  webview.injectJavaScript(js + '\ntrue;');
}

// ── 부팅 / 준비 상태 ──
let booted = false;
/** WebView 를 아예 쓸 수 없을 때(구 빌드 등)의 사유 — 이후 요청은 즉시 이 오류로 실패한다 */
let bootError: Error | null = null;
type BootWaiter = { resolve: () => void; reject: (e: Error) => void };
let bootWaiters: BootWaiter[] = [];

/** WebView 스크립트가 'boot' 를 보내면 호출된다 (webviewHtml 이 로드 완료된 시점) */
function onBoot(): void {
  booted = true;
  bootError = null;
  glueInjected = false; // 리로드되었을 수 있으니 초기화
  readyVoices.clear();
  voiceLoading.clear();
  const waiters = bootWaiters;
  bootWaiters = [];
  waiters.forEach((w) => w.resolve());
}

/**
 * react-native-webview 를 쓸 수 없을 때 호스트(FliteSynthHost)가 호출한다.
 * (네이티브 모듈이 빠진 구 개발 빌드 — `npm run android` 재빌드 전)
 * 이후 오프라인 합성 요청을 즉시 실패시켜, 조용히 멈추지 않고 안내가 뜨게 한다.
 */
export function markFliteUnavailable(): void {
  bootError = new Error(
    '오프라인 엔진을 쓸 수 없습니다 — react-native-webview 가 빠진 빌드입니다. `npm run android` 로 개발 빌드를 다시 설치하세요.',
  );
  const waiters = bootWaiters;
  bootWaiters = [];
  waiters.forEach((w) => w.reject(bootError!));
  rejectAllVoiceLoads(bootError);
}

function waitBoot(): Promise<void> {
  if (booted) return Promise.resolve();
  if (bootError) return Promise.reject(bootError);
  return new Promise((resolve, reject) => bootWaiters.push({ resolve, reject }));
}

// ── 메시지 수신 (FliteSynthHost 의 onMessage → 여기로) ──
type WavPending = {
  resolve: (r: { base64: string; sampleRate: number }) => void;
  reject: (e: Error) => void;
};
const synthPending = new Map<string, WavPending>();
const voiceReadyWaiters = new Map<FliteVoiceKey, (() => void)[]>();

export function handleFliteMessage(raw: string): void {
  let msg: {
    type: string;
    voice?: FliteVoiceKey;
    id?: string;
    base64?: string;
    sampleRate?: number;
    message?: string;
  };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  switch (msg.type) {
    case 'boot':
      onBoot();
      break;
    case 'ready':
      if (msg.voice) resolveVoiceReady(msg.voice);
      break;
    case 'wav': {
      const p = msg.id ? synthPending.get(msg.id) : undefined;
      if (p && msg.id) {
        synthPending.delete(msg.id);
        p.resolve({ base64: msg.base64 ?? '', sampleRate: msg.sampleRate ?? 0 });
      }
      break;
    }
    case 'error': {
      const err = new Error(msg.message || 'Flite 합성 오류');
      if (msg.id) {
        const p = synthPending.get(msg.id);
        if (p) {
          synthPending.delete(msg.id);
          p.reject(err);
        }
      } else {
        // voice 로딩 단계의 오류 — 대기 중인 로더를 모두 깨운다
        rejectAllVoiceLoads(err);
      }
      break;
    }
  }
}

function resolveVoiceReady(voice: FliteVoiceKey): void {
  readyVoices.add(voice);
  const waiters = voiceReadyWaiters.get(voice);
  if (waiters) {
    voiceReadyWaiters.delete(voice);
    waiters.forEach((w) => w());
  }
}

// ── voice 초기화 (glue 주입 + wasm 청크 주입 + init) ──
const readyVoices = new Set<FliteVoiceKey>();
const voiceLoading = new Map<FliteVoiceKey, Promise<void>>();
let glueInjected = false;
let loadRejecters: ((e: Error) => void)[] = [];

function rejectAllVoiceLoads(err: Error): void {
  const rejecters = loadRejecters;
  loadRejecters = [];
  rejecters.forEach((r) => r(err));
}

const GLUE_MODULE = require('../../assets/flite/flite.fliteglue');
const WASM_MODULE: Record<FliteVoiceKey, number> = {
  cmu_us_slt: require('../../assets/flite/cmu_us_slt.wasm'),
};

async function readAssetText(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return new File(asset.localUri ?? asset.uri).text();
}

async function readAssetBase64(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const bytes = await new File(asset.localUri ?? asset.uri).bytes();
  return bytesToBase64(bytes);
}

/** 해당 voice 모듈이 WebView 안에 초기화되어 있도록 보장한다 (동시 호출은 하나로 합쳐짐) */
export function ensureFliteVoice(voice: FliteVoiceKey): Promise<void> {
  if (readyVoices.has(voice)) return Promise.resolve();
  const inflight = voiceLoading.get(voice);
  if (inflight) return inflight;

  const p = (async () => {
    // 부트가 끝없이 안 오면(WebView 미탑재 등) 무한 대기 대신 오류로 끝낸다
    await withTimeout(
      waitBoot(),
      15000,
      '오프라인 합성기를 시작하지 못했습니다 — 개발 빌드를 다시 설치했는지(`npm run android`) 확인하세요.',
    );
    if (!glueInjected) {
      const glue = await readAssetText(GLUE_MODULE);
      inject(`window.__fliteGlue(${JSON.stringify(glue)});`);
      glueInjected = true;
    }
    const b64 = await readAssetBase64(WASM_MODULE[voice]);

    const ready = new Promise<void>((resolve, reject) => {
      const list = voiceReadyWaiters.get(voice) ?? [];
      list.push(resolve);
      voiceReadyWaiters.set(voice, list);
      loadRejecters.push(reject);
    });

    inject('window.__fliteReset();');
    const CHUNK = 512 * 1024; // base64 문자 기준
    for (let i = 0; i < b64.length; i += CHUNK) {
      inject(`window.__fliteChunk(${JSON.stringify(b64.slice(i, i + CHUNK))});`);
    }
    inject(`window.__fliteInit(${JSON.stringify(voice)});`);

    await withTimeout(ready, 30000, 'Flite 음성 초기화 시간 초과');
  })()
    .catch((e: unknown) => {
      voiceLoading.delete(voice); // 실패 시 다음 호출에서 재시도
      throw e instanceof Error ? e : new Error(String(e));
    })
    .then(() => {
      voiceLoading.delete(voice);
    });

  voiceLoading.set(voice, p);
  return p;
}

// ── 합성 ──
let idCounter = 0;

/**
 * 한 문장을 합성해 WAV(base64) + 샘플레이트를 돌려준다. base64:'' 이면 빈 결과.
 * rate/pitch 는 배수(1 = 기본) — 합성 시점에 파형에 반영된다.
 */
export async function fliteSynthWav(
  voice: FliteVoiceKey,
  text: string,
  rate: number,
  pitch: number,
): Promise<{ base64: string; sampleRate: number }> {
  await ensureFliteVoice(voice);
  const id = String(++idCounter);
  const result = new Promise<{ base64: string; sampleRate: number }>((resolve, reject) => {
    synthPending.set(id, { resolve, reject });
  });
  inject(
    `window.__fliteSynth(${JSON.stringify(id)}, ${JSON.stringify(voice)}, ${JSON.stringify(text)}, ${rate}, ${pitch});`,
  );
  return withTimeout(result, 20000, 'Flite 합성 시간 초과').catch((e) => {
    synthPending.delete(id);
    throw e;
  });
}

// ── 유틸 ──
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Uint8Array → base64 (Hermes 에 btoa 가 없을 수 있어 직접 구현) */
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < len ? B64_ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < len ? B64_ALPHABET[b2 & 63] : '=';
  }
  return out;
}
