/**
 * 이어보기 — 책마다 마지막으로 읽던 단어 위치를 저장한다.
 */
import { createJsonStore } from './jsonStore';

export type BookProgress = {
  /** 0-based 단어 인덱스 */
  wordIndex: number;
  /** 그 시점의 총 단어 수 — 데이터가 바뀌어 범위를 벗어나는 것을 감지한다 */
  total: number;
  /** ISO 8601 */
  updatedAt: string;
};

type Store = Record<string, BookProgress>;

const store = createJsonStore<Store>('progress.json', 'mp-word:progress', {});

export function getProgress(slug: string): BookProgress | undefined {
  return store.read()[slug];
}

export function setProgress(slug: string, wordIndex: number, total: number): void {
  const current = store.read();
  const saved = current[slug];
  if (saved && saved.wordIndex === wordIndex && saved.total === total) return;
  store.write({ ...current, [slug]: { wordIndex, total, updatedAt: new Date().toISOString() } });
}

export function clearProgress(slug: string): void {
  const current = store.read();
  if (!(slug in current)) return;
  const next = { ...current };
  delete next[slug];
  store.write(next);
}

/** 저장된 위치를 현재 단어 수에 맞춰 안전한 인덱스로 바꾼다 */
export function resumeIndex(slug: string, total: number): number {
  const saved = getProgress(slug);
  if (!saved) return 0;
  return Math.max(0, Math.min(saved.wordIndex, total - 1));
}
