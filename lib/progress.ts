/**
 * 이어보기 — 책마다 마지막으로 읽던 단어 위치를 저장한다.
 *
 * 네이티브는 문서 디렉터리의 JSON 파일, 웹은 localStorage.
 * 파일 시스템은 SDK 54 의 새 API(File/Paths)를 쓴다 (legacy API 금지).
 */
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const FILE_NAME = 'progress.json';
const WEB_KEY = 'mp-word:progress';

export type BookProgress = {
  /** 0-based 단어 인덱스 */
  wordIndex: number;
  /** 그 시점의 총 단어 수 — 데이터가 바뀌어 범위를 벗어나는 것을 감지한다 */
  total: number;
  /** ISO 8601 */
  updatedAt: string;
};

type Store = Record<string, BookProgress>;

let cache: Store | null = null;

function nativeFile(): File {
  return new File(Paths.document as Directory, FILE_NAME);
}

function read(): Store {
  if (cache) return cache;
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(WEB_KEY);
      cache = raw ? (JSON.parse(raw) as Store) : {};
    } else {
      const file = nativeFile();
      cache = file.exists ? (JSON.parse(file.textSync()) as Store) : {};
    }
  } catch {
    // 손상된 파일이면 버리고 새로 시작한다 (읽기 위치일 뿐이라 복구할 가치가 없다)
    cache = {};
  }
  return cache;
}

function write(store: Store): void {
  cache = store;
  const json = JSON.stringify(store);
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(WEB_KEY, json);
      return;
    }
    const file = nativeFile();
    if (!file.exists) file.create();
    file.write(json);
  } catch {
    // 저장 실패는 조용히 넘긴다 — 읽기 위치를 못 남길 뿐 재생에는 지장이 없다
  }
}

export function getProgress(slug: string): BookProgress | undefined {
  return read()[slug];
}

export function setProgress(slug: string, wordIndex: number, total: number): void {
  const store = read();
  const current = store[slug];
  if (current && current.wordIndex === wordIndex && current.total === total) return;
  write({ ...store, [slug]: { wordIndex, total, updatedAt: new Date().toISOString() } });
}

export function clearProgress(slug: string): void {
  const store = read();
  if (!(slug in store)) return;
  const next = { ...store };
  delete next[slug];
  write(next);
}

/** 저장된 위치를 현재 단어 수에 맞춰 안전한 인덱스로 바꾼다 */
export function resumeIndex(slug: string, total: number): number {
  const saved = getProgress(slug);
  if (!saved) return 0;
  return Math.max(0, Math.min(saved.wordIndex, total - 1));
}
