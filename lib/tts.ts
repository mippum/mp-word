/**
 * TTS 추상화 — expo-speech 한 겹 위.
 *
 * 대본(Utterance[])을 순서대로 읽고, 발화 사이에는 pauseAfterMs 만큼 실제로 쉰다.
 * **SSML 을 쓰지 않는다** — 태그 없이 순수 텍스트만 엔진에 넘기므로 어떤 엔진에서도
 * 결과가 같다. 쉼과 철자 낭독은 lib/script.ts 가 미리 만들어 둔다.
 *
 * 재생 속도·음높이는 지정하지 않는다 — 시스템 "글자 읽어주기" 설정을 그대로 따른다
 * (앱 설정과 시스템 설정이 곱해져 혼란스러워지는 것을 막는다).
 *
 * 화면에서 이 모듈을 직접 부르지 말 것. 재생은 항상 lib/player.ts 를 통한다.
 */
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import type { Utterance } from './script';

/** BCP 47 코드 — 문장 단위로 전환한다 */
const LANGUAGE_TAG: Record<Utterance['lang'], string> = {
  en: 'en-US',
  ko: 'ko-KR',
};

/** Android 는 expo-speech 의 pause/resume 를 지원하지 않는다 */
export const supportsPause = Platform.OS !== 'android';

export type SpeakHandlers = {
  /** 발화가 하나 시작될 때마다 (대본 안에서의 인덱스) */
  onUtterance?: (index: number) => void;
  /** 대본을 끝까지 읽었을 때 */
  onDone?: () => void;
  onError?: (message: string) => void;
};

/**
 * 재생 세대(generation). stop() 이나 새 speak() 가 이 값을 올리면
 * 진행 중이던 순차 재생 루프는 자기 세대가 아님을 보고 조용히 빠져나간다.
 */
let generation = 0;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 일시정지 게이트.
 * 엔진이 읽는 중에 pause() 하면 onDone 이 오지 않아 루프가 저절로 멈추지만,
 * 발화 **사이의 쉼** 중에 pause() 하면 엔진은 놀고 있어서 루프가 다음 문장으로
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

/** 발화 하나 — onDone/onStopped/onError 중 하나가 올 때까지 기다린다 */
function speakOne(utterance: Utterance): Promise<'done' | 'stopped'> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (result: 'done' | 'stopped') => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    Speech.speak(utterance.text, {
      language: LANGUAGE_TAG[utterance.lang],
      onDone: () => settle('done'),
      onStopped: () => settle('stopped'),
      onError: (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      },
    });
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
 * 대본을 fromIndex 부터 순서대로 읽는다.
 * 이미 재생 중이면 그것을 멈추고 새로 시작한다.
 */
export async function speak(
  utterances: Utterance[],
  fromIndex: number,
  handlers: SpeakHandlers = {}
): Promise<void> {
  await stop();
  const mine = ++generation;
  const start = Math.max(0, Math.min(fromIndex, utterances.length - 1));

  for (let index = start; index < utterances.length; index += 1) {
    await gate();
    if (generation !== mine) return;
    const utterance = utterances[index];
    handlers.onUtterance?.(index);

    try {
      const result = await speakOne(utterance);
      if (generation !== mine || result === 'stopped') return;
    } catch (error) {
      if (generation !== mine) return;
      handlers.onError?.(error instanceof Error ? error.message : '읽기에 실패했습니다');
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
  try {
    await Speech.stop();
  } catch {
    // 재생 중이 아니면 엔진이 오류를 낼 수 있다 — 무시한다
  }
}

/** iOS·웹 전용. Android 에서는 호출하지 말 것 (supportsPause 로 분기) */
export async function pause(): Promise<void> {
  paused = true;
  await Speech.pause();
}

export async function resume(): Promise<void> {
  await Speech.resume();
  releaseGate();
}
