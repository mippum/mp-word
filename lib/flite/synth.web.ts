import { Asset } from 'expo-asset';

import { fliteVoiceKey, type FliteVoiceKey } from './voices';

/**
 * Flite(WASM) 오프라인 영어 합성 — 웹(개발 확인용) 구현.
 *
 * 웹은 브라우저가 WebAssembly + WebAudio 를 그대로 돌리므로 WebView 없이 바로 합성한다.
 * (네이티브는 Hermes 가 WASM 을 못 돌려 숨은 WebView 에서 합성한다 — bridge.native.ts)
 *
 * glue(.js)/wasm 은 네이티브와 같은 번들 에셋(assets/flite/*, metro.config.js assetExts)에서
 * 읽는다 — 별도 public/ 폴더를 두지 않는다 (정션 빌드에서 public 경로가 프로젝트 루트 밖으로
 * 잡혀 Metro 가 실패하는 문제도 피한다).
 */

/** Emscripten 모듈에서 우리가 쓰는 부분만 (native/flite_wrapper.c 의 export) */
type FliteModule = {
  _tts_init(): number;
  _tts_synth(textPtr: number): number;
  _tts_samples(): number;
  _tts_sample_rate(): number;
  _tts_clear(): void;
  _tts_set_rate?(rate: number): void;
  _tts_set_pitch?(pitch: number): void;
  _free(ptr: number): void;
  HEAP16: Int16Array;
  stringToNewUTF8(str: string): number;
};

type FliteFactory = (opts?: Record<string, unknown>) => Promise<FliteModule>;

/**
 * 번들러 정적 분석을 피해 런타임 URL 로 glue 모듈을 불러온다.
 * (public/ 파일은 모듈 그래프에 없어 정적 import 로는 해석되지 않는다)
 */
const importModule = new Function('url', 'return import(url);') as (
  url: string,
) => Promise<{ default: FliteFactory }>;

const modules = new Map<FliteVoiceKey, Promise<FliteModule>>();

// 번들 에셋 (네이티브와 공통 원본). glue 두 종의 유일한 차이는 내장 wasm 파일명뿐이라,
// wasmBinary 를 직접 주면 glue 하나로 두 음성을 다 처리한다.
const GLUE_ASSET: number = require('../../assets/flite/flite.fliteglue');
const WASM_ASSET: Record<FliteVoiceKey, number> = {
  cmu_us_slt: require('../../assets/flite/cmu_us_slt.wasm'),
};

/** 번들 에셋의 로컬/서빙 URI 를 얻는다 (웹: Metro 가 서빙하는 URL) */
async function assetUri(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}

function loadModule(voice: FliteVoiceKey): Promise<FliteModule> {
  let p = modules.get(voice);
  if (!p) {
    p = (async () => {
      const [glueUri, wasmUri] = await Promise.all([
        assetUri(GLUE_ASSET),
        assetUri(WASM_ASSET[voice]),
      ]);
      const [glueSrc, wasmBinary] = await Promise.all([
        fetch(glueUri).then((r) => r.text()),
        fetch(wasmUri).then((r) => r.arrayBuffer()),
      ]);
      // glue 는 .fliteglue 에셋(비-JS MIME)이라 정적 import 로는 로드되지 않는다 →
      // blob URL 로 감싸 모듈로 불러온다.
      // 이 glue 빌드는 Module.wasmBinary 를 읽지 않고 locateFile 이 준 URL 을 fetch 한다.
      // wasm 바이트로 blob URL 을 만들어 locateFile 로 넘기면 glue 가 그 blob 을 받아 로딩한다.
      const wasmUrl = URL.createObjectURL(new Blob([wasmBinary], { type: 'application/wasm' }));
      const glueBlobUrl = URL.createObjectURL(new Blob([glueSrc], { type: 'text/javascript' }));
      const { default: factory } = await importModule(glueBlobUrl);
      const mod = await factory({ locateFile: () => wasmUrl });
      if (mod._tts_init() !== 1) throw new Error('Flite 엔진 초기화에 실패했습니다.');
      return mod;
    })().catch((e: unknown) => {
      modules.delete(voice); // 실패한 프로미스를 캐시하면 재시도가 영구히 막힌다
      throw e;
    });
    modules.set(voice, p);
  }
  return p;
}

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
/**
 * 재생 세대 — fliteStop() 마다 증가한다.
 * wasm 로드(3MB)·합성 중에 정지(뒤로 가기 등)가 들어오면 멈출 대상이 아직 없으므로,
 * 재생 직전에 세대를 확인해 **정지 뒤 뒤늦게 시작되는 것**을 막는다.
 */
let playEpoch = 0;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/**
 * 오디오 컨텍스트를 미리 깨운다 — **반드시 사용자 제스처(재생 버튼) 안에서 동기로** 호출.
 * wasm(3MB) 로드 후에 resume 하면 제스처가 만료돼 컨텍스트가 suspended 로 남고,
 * source.start 가 소리도 못 내고 onended 도 안 와 첫 문장에서 멈춘다. 이를 막는다.
 */
export function warmupFliteAudio(): void {
  const ctx = getCtx();
  if (ctx.state === 'suspended') void ctx.resume();
}

/** 현재 재생 중인 Flite 오디오를 멈춘다 (onended 가 발생해 대기 중 promise 도 풀린다) */
export function fliteStop(): void {
  playEpoch++; // 진행 중인(합성 대기 중인) 재생 요청을 무효화
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      // 이미 정지됨
    }
    currentSource = null;
  }
}

/**
 * 한 문장을 Flite 로 합성해 재생하고, 재생이 끝나면(또는 stop 되면) resolve 한다.
 * @param voiceId `flite:cmu_us_slt` 등 Flite 센티넬 목소리 id
 * @param rate/pitch 배수(1 = 기본) — 합성 파형에 반영된다
 */
export async function fliteSpeak(
  voiceId: string,
  text: string,
  rate = 1,
  pitch = 1,
): Promise<void> {
  const voice = fliteVoiceKey(voiceId);
  if (!voice) throw new Error('Flite 목소리가 아닙니다: ' + voiceId);
  if (!text.trim()) return;

  const epoch = playEpoch; // 이 요청의 세대 — 중간에 정지되면 조용히 취소한다
  const mod = await loadModule(voice);
  if (epoch !== playEpoch) return;

  // ── 합성 (WASM 힙에서 즉시 Float32 로 복사) ──
  mod._tts_set_rate?.(rate);
  mod._tts_set_pitch?.(pitch);
  const textPtr = mod.stringToNewUTF8(text);
  let numSamples: number;
  try {
    numSamples = mod._tts_synth(textPtr);
  } finally {
    mod._free(textPtr);
  }
  if (numSamples <= 0) return;

  const sampleRate = mod._tts_sample_rate();
  const ptr = mod._tts_samples();
  const int16 = mod.HEAP16.subarray(ptr >> 1, (ptr >> 1) + numSamples);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) samples[i] = int16[i] / 32768;
  mod._tts_clear();

  // ── 재생 ──
  if (epoch !== playEpoch) return;
  const ctx = getCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  if (epoch !== playEpoch) return;
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.getChannelData(0).set(samples);

  await new Promise<void>((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (currentSource === source) currentSource = null;
      resolve();
    };
    source.onended = finish;
    // onended 가 오지 않는 경우(컨텍스트 정지 등)에도 멈추지 않도록 버퍼 길이 + 여유로 폴백
    const timer = setTimeout(finish, Math.ceil(buffer.duration * 1000) + 800);
    currentSource = source;
    source.start(0);
  });
}
