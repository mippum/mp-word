/**
 * 전역 단일 플레이어.
 *
 * 화면은 usePlayer() 로 상태를 구독하고, 재생 조작은 전부 이 모듈을 거친다
 * (lib/tts.ts 를 화면에서 직접 부르지 말 것 — 동시 재생을 막기 위해서다).
 */
import { useSyncExternalStore } from 'react';

import type { Book } from './books';
import { setProgress } from './progress';
import { utterancesForBook, wordStartIndexes, type Utterance } from './script';
import * as tts from './tts';

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

export type PlayerSnapshot = {
  /** 재생 중인 책 (없으면 null) */
  slug: string | null;
  status: PlaybackStatus;
  /** 지금 읽고 있는 단어 (0-based, -1 = 없음) */
  wordIndex: number;
  /** 대본 안에서의 발화 인덱스 (-1 = 없음) */
  utteranceIndex: number;
  /** 지면의 어느 부분을 읽고 있는지 */
  slot: Utterance['slot'] | null;
  /** 이 책의 총 단어 수 */
  total: number;
};

const IDLE: PlayerSnapshot = {
  slug: null,
  status: 'idle',
  wordIndex: -1,
  utteranceIndex: -1,
  slot: null,
  total: 0,
};

let snapshot: PlayerSnapshot = IDLE;
const listeners = new Set<() => void>();
const errorListeners = new Set<(message: string) => void>();

function update(patch: Partial<PlayerSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PlayerSnapshot {
  return snapshot;
}

export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function subscribeError(listener: (message: string) => void): () => void {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

function emitError(message: string) {
  errorListeners.forEach((listener) => listener(message));
}

/** 지금 재생 중인 책의 대본 — 단어 단위 탐색에 쓴다 */
let current: { book: Book; utterances: Utterance[]; starts: number[] } | null = null;

function prepare(book: Book) {
  if (current?.book.slug === book.slug) return current;
  const utterances = utterancesForBook(book.words);
  current = { book, utterances, starts: wordStartIndexes(utterances) };
  return current;
}

function run(book: Book, fromUtterance: number) {
  const prepared = prepare(book);
  update({
    slug: book.slug,
    status: 'playing',
    total: book.words.length,
    utteranceIndex: fromUtterance,
    wordIndex: prepared.utterances[fromUtterance]?.wordIndex ?? 0,
    slot: prepared.utterances[fromUtterance]?.slot ?? null,
  });

  void tts.speak(prepared.utterances, fromUtterance, {
    onUtterance: (index) => {
      const utterance = prepared.utterances[index];
      if (!utterance) return;
      const wordChanged = utterance.wordIndex !== snapshot.wordIndex;
      update({ utteranceIndex: index, wordIndex: utterance.wordIndex, slot: utterance.slot });
      if (wordChanged) setProgress(book.slug, utterance.wordIndex, book.words.length);
    },
    onDone: () => {
      // 끝까지 들었으면 이어보기 위치를 처음으로 되돌린다
      setProgress(book.slug, 0, book.words.length);
      update({ status: 'idle', slot: null });
    },
    onError: (message) => {
      update({ status: 'idle', slot: null });
      emitError(message);
    },
  });
}

/** 책의 특정 단어부터 재생 */
export function playBook(book: Book, wordIndex = 0): void {
  const prepared = prepare(book);
  const safe = Math.max(0, Math.min(wordIndex, book.words.length - 1));
  run(book, prepared.starts[safe] ?? 0);
}

export async function stopPlayback(): Promise<void> {
  await tts.stop();
  update({ status: 'idle', slot: null });
}

/** iOS·웹만 진짜 일시정지. Android 는 정지하고 위치를 기억한다 */
export async function pause(): Promise<void> {
  if (tts.supportsPause) {
    await tts.pause();
    update({ status: 'paused' });
    return;
  }
  await tts.stop();
  update({ status: 'paused' });
}

export function resume(book: Book): void {
  if (tts.supportsPause && snapshot.slug === book.slug && snapshot.utteranceIndex >= 0) {
    void tts.resume();
    update({ status: 'playing' });
    return;
  }
  // Android: 멈춘 단어의 처음부터 다시 읽는다
  playBook(book, snapshot.slug === book.slug ? Math.max(0, snapshot.wordIndex) : 0);
}

/** 이전/다음 단어로 이동 — 재생 중이 아니면 그 단어부터 재생을 시작한다 */
export function jumpWord(book: Book, delta: number): void {
  const base = snapshot.slug === book.slug ? snapshot.wordIndex : 0;
  playBook(book, Math.max(0, Math.min(base + delta, book.words.length - 1)));
}

export function playWord(book: Book, wordIndex: number): void {
  playBook(book, wordIndex);
}

/**
 * 설정 화면 목소리 미리듣기.
 * 재생은 전부 이 모듈을 거쳐야 하므로(전역 단일 재생) 여기서 진행 중 재생을 먼저 멈춘다.
 */
export async function previewVoice(lang: Utterance['lang'], voiceId: string | null): Promise<void> {
  await stopPlayback();
  try {
    await tts.previewVoice(lang, voiceId);
  } catch (e) {
    emitError(e instanceof Error ? e.message : '미리듣기에 실패했습니다');
  }
}
