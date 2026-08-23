import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

/**
 * Flite 합성 결과(WAV)를 네이티브에서 재생한다 (expo-audio).
 *
 * WebView 안에서 재생하지 않는 이유: 백그라운드/화면 꺼짐에서 WebAudio 는 멈춘다.
 * expo-audio 는 tts.ts 와 동일한 백그라운드 오디오 세션을 쓰므로 잠금화면에서도 이어진다.
 */

let current: AudioPlayer | null = null;
let currentResolve: (() => void) | null = null;
let wavCounter = 0;
let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  audioModeReady = true;
  await setAudioModeAsync({
    shouldPlayInBackground: true,
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
  }).catch(() => {
    audioModeReady = false; // 실패 시 다음에 재시도
  });
}

/**
 * 재생 세대 — fliteStopAudio() 마다 증가한다.
 * 합성(WebView 왕복)·파일 쓰기 중에 정지(뒤로 가기 등)가 들어오면 멈출 대상이 아직 없으므로,
 * 재생 직전에 세대를 확인해 **정지 뒤 뒤늦게 시작되는 것**을 막는다.
 */
let playEpoch = 0;

/** 진행 중인 재생만 정리한다 (세대는 올리지 않음 — 새 재생이 스스로를 취소하지 않도록) */
function stopCurrent(): void {
  const resolve = currentResolve;
  currentResolve = null;
  if (current) {
    try {
      // remove() 만으로는 즉시 멈추지 않을 수 있어 먼저 정지시킨다
      current.pause();
    } catch {
      // 이미 정지됨
    }
    try {
      current.remove();
    } catch {
      // 이미 해제됨
    }
    current = null;
  }
  if (resolve) resolve();
}

/** 현재 재생 중인 Flite 오디오를 멈추고, 대기 중 promise 를 즉시 푼다 */
export function fliteStopAudio(): void {
  playEpoch++; // 합성 대기 중인 재생 요청도 무효화
  stopCurrent();
}

/**
 * WAV(base64)를 파일로 써서 재생하고, 끝나면(또는 stop 되면) resolve 한다.
 * base64 가 비어 있으면(빈 합성 결과) 즉시 반환한다.
 */
export async function flitePlayWav(base64: string): Promise<void> {
  if (!base64) return;
  const epoch = playEpoch; // 이 요청의 세대 — 중간에 정지되면 조용히 취소한다
  await ensureAudioMode();
  if (epoch !== playEpoch) return;
  stopCurrent();

  const file = new File(Paths.cache, `flite-${++wavCounter}.wav`);
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(base64ToBytes(base64));
  } catch (e) {
    throw e instanceof Error ? e : new Error('합성 오디오 파일을 쓰지 못했습니다');
  }
  // 파일을 쓰는 동안 정지됐을 수 있다 — 재생 직전 마지막 확인
  if (epoch !== playEpoch) {
    try {
      file.delete();
    } catch {
      /* noop */
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const player = createAudioPlayer(file.uri);
    current = player;
    currentResolve = resolve;
    const cleanup = () => {
      if (current === player) {
        current = null;
        currentResolve = null;
      }
      try {
        player.remove();
      } catch {
        /* noop */
      }
      try {
        file.delete();
      } catch {
        /* noop */
      }
    };
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        cleanup();
        resolve();
      }
    });
    player.play();
  });
}

const B64_LOOKUP = (() => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i;
  return table;
})();

/** base64 → Uint8Array (Hermes 에 atob 가 없을 수 있어 직접 구현) */
function base64ToBytes(b64: string): Uint8Array {
  let len = b64.length;
  while (len > 0 && b64[len - 1] === '=') len--; // 패딩 제거
  const outLen = (len * 3) >> 2;
  const out = new Uint8Array(outLen);
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const c = B64_LOOKUP[b64.charCodeAt(i)];
    if (c < 0) continue; // 개행 등 무시
    acc = (acc << 6) | c;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return o === outLen ? out : out.subarray(0, o);
}
