/**
 * 번들된 책 데이터 로더.
 *
 * 데이터는 `ref/tool/word_csv_data_mng_py/scripts/export_book_json.py` 가
 * source/*.csv 에서 만들어 `assets/books/` 에 넣는다. 앱은 읽기만 한다.
 *
 * 책 한 권 = word_by_books 의 book_name 하나, order 1..69 가 지면 순서다.
 */

export type BookWord = {
  order: number;
  wordId: string;
  word: string;
  /** 'drop' -> 'D. R. O. P.' — 지면과 낭독이 같은 문자열을 쓴다 */
  spelling: string;
  pronunciationUs: string;
  pronunciationGb: string;
  sentence: string;
  sentenceKo: string;
  /** 낭독용 한글 (숫자·괄호가 정리된 형태). 없으면 sentenceKo 와 같다 */
  sentenceKoReadAloud: string;
  meaningEn: string;
  meaningKo: string;
  meaningKoReadAloud: string;
  hasIcon: boolean;
};

export type Book = {
  slug: string;
  name: string;
  /** 'Basic', 'Core' 등 — name 에서 'Foundation' 과 서수를 뺀 부분 */
  level: string;
  /** 레벨 안에서 몇 권째인지 (First = 1) */
  volume: number;
  wordCount: number;
  avgMpfpm: number;
  words: BookWord[];
};

type BooksPayload = {
  generatedAt: string;
  /** 쉬운 레벨부터 (권별 평균 빈도 내림차순) */
  levels: string[];
  books: Book[];
};

// import 로 가져오면 tsc 가 2MB JSON 을 통째로 리터럴 타입으로 추론해 느려진다.
// 런타임 동작은 같으므로 require + 캐스트를 쓴다.
const payload: BooksPayload = require('@/assets/books/books.json');

/**
 * 아이콘은 권별로 나뉘어 있다 (전체 11MB — 한 파일이면 앱이 통째로 파싱한다).
 * Metro 는 동적 require 를 못 쓰므로 export_book_json.py 가 만든 정적 맵을 거친다.
 */
const iconModules: Record<string, () => Record<string, string>> = require('@/assets/books/icons');

const bySlug = new Map(payload.books.map((book) => [book.slug, book]));

export function listBooks(): Book[] {
  return payload.books;
}

export function listLevels(): string[] {
  return payload.levels;
}

export function getBook(slug: string): Book | undefined {
  return bySlug.get(slug);
}

/** 레벨별로 묶은 목록 — 목록 화면의 섹션 구성용 */
export function booksByLevel(): { level: string; books: Book[] }[] {
  return payload.levels.map((level) => ({
    level,
    books: payload.books.filter((book) => book.level === level),
  }));
}

const iconCache = new Map<string, Record<string, string>>();

/** 그 권의 단어 아이콘 (word_id -> SVG 문자열). 첫 호출에서만 JSON 을 파싱한다. */
export function iconsForBook(slug: string): Record<string, string> {
  const cached = iconCache.get(slug);
  if (cached) return cached;
  const load = iconModules[slug];
  const icons = load ? load() : {};
  iconCache.set(slug, icons);
  return icons;
}
