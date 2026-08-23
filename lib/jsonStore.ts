/**
 * 작은 JSON 저장소 — 네이티브는 문서 디렉터리의 파일, 웹은 localStorage.
 * 파일 시스템은 SDK 54 의 새 API(File/Paths)를 쓴다 (legacy API 금지).
 *
 * 읽기 위치·설정처럼 잃어도 치명적이지 않은 값만 담는다 (실패는 조용히 넘긴다).
 */
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

export type JsonStore<T> = {
  read: () => T;
  write: (value: T) => void;
};

export function createJsonStore<T>(fileName: string, webKey: string, initial: T): JsonStore<T> {
  let cache: T | null = null;

  const file = () => new File(Paths.document as Directory, fileName);

  const read = (): T => {
    if (cache !== null) return cache;
    try {
      if (Platform.OS === 'web') {
        const raw = globalThis.localStorage?.getItem(webKey);
        cache = raw ? (JSON.parse(raw) as T) : initial;
      } else {
        const handle = file();
        cache = handle.exists ? (JSON.parse(handle.textSync()) as T) : initial;
      }
    } catch {
      // 손상된 파일이면 버리고 새로 시작한다
      cache = initial;
    }
    return cache;
  };

  const write = (value: T): void => {
    cache = value;
    const json = JSON.stringify(value);
    try {
      if (Platform.OS === 'web') {
        globalThis.localStorage?.setItem(webKey, json);
        return;
      }
      const handle = file();
      if (!handle.exists) handle.create();
      handle.write(json);
    } catch {
      // 저장 실패는 조용히 넘긴다
    }
  };

  return { read, write };
}
