/**
 * 낭독 대본 — 단어 데이터를 "발화 목록"으로 펼친다.
 *
 * 교재 낭독 순서는 ref/epub/mp-word-toeic/mvp/text.csv 의 슬롯 1~7 과 같지만,
 * **앱은 SSML 을 쓰지 않는다.** text.csv 의 태그는 다음으로 대체한다.
 *
 *   <break time='300ms'/>                     -> 발화 사이 pauseAfterMs (실제 대기)
 *   <say-as interpret-as='characters'>drop</>  -> 'D. R. O. P.' 문자열 (책 지면과 동일)
 *
 * 태그가 없으니 어떤 TTS 엔진이든 같은 결과가 나오고, 지면에 그대로 인쇄된 문자열을
 * 그대로 읽는다 (책과 앱의 내용이 어긋나지 않는다).
 */
import type { BookWord } from './books';
import { ordinalWord } from './ordinal';

/** 지면의 어느 부분을 읽고 있는지 — 하이라이트가 이 값으로 붙는다 */
export type Slot =
  | 'sentence' // 1. 예문 + 순번 안내
  | 'keyword' // 2. 키워드 + 철자
  | 'meaningEn' // 3. 영영사전 뜻
  | 'meaningKo' // 4. 한글 뜻
  | 'reading' // 5. 한글 해석 + 예문
  | 'sentenceEn' // 6. 예문 (영)
  | 'sentenceKo'; // 7. 한글 해석

export type Utterance = {
  /** 실제로 읽을 문자열. SSML 태그가 없는 순수 텍스트 */
  text: string;
  lang: 'en' | 'ko';
  /** 이 발화가 끝난 뒤 쉬는 시간 (ms) — SSML break 대신 */
  pauseAfterMs: number;
  /** 책 안에서 몇 번째 단어인지 (0-based) */
  wordIndex: number;
  slot: Slot;
};

const SHORT = 300;
const LONG = 600;
const BETWEEN_WORDS = 900;

/** 단어 하나의 낭독 대본. wordIndex 는 0-based, 순번 안내는 order 를 쓴다. */
export function utterancesForWord(word: BookWord, wordIndex: number): Utterance[] {
  const out: Utterance[] = [];
  const push = (text: string, lang: 'en' | 'ko', pauseAfterMs: number, slot: Slot) => {
    const trimmed = text.trim();
    if (trimmed) out.push({ text: trimmed, lang, pauseAfterMs, wordIndex, slot });
  };

  // 1. 예문 → 순번 안내 → 예문
  push(word.sentence, 'en', SHORT, 'sentence');
  push(`${ordinalWord(word.order)} Sentence.`, 'en', SHORT, 'sentence');
  push(word.sentence, 'en', LONG, 'sentence');

  // 2. 키워드 → 단어 → 철자 → 단어
  push('Keyword.', 'en', SHORT, 'keyword');
  push(`${word.word}.`, 'en', SHORT, 'keyword');
  push(word.spelling, 'en', 100, 'keyword');
  push(`${word.word}.`, 'en', LONG, 'keyword');

  // 3. 영영사전 뜻
  push(word.meaningEn, 'en', LONG, 'meaningEn');

  // 4. 한글 뜻 → 단어 → 한글 뜻 → 단어
  push(word.meaningKoReadAloud, 'ko', SHORT, 'meaningKo');
  push(`${word.word}.`, 'en', SHORT, 'meaningKo');
  push(word.meaningKoReadAloud, 'ko', SHORT, 'meaningKo');
  push(`${word.word}.`, 'en', LONG, 'meaningKo');

  // 5. 한글 해석 → 예문 → 한글 해석
  push(word.sentenceKoReadAloud, 'ko', SHORT, 'reading');
  push(word.sentence, 'en', SHORT, 'reading');
  push(word.sentenceKoReadAloud, 'ko', LONG, 'reading');

  // 6~7. 예문 한 번, 해석 한 번
  push(word.sentence, 'en', LONG, 'sentenceEn');
  push(word.sentenceKoReadAloud, 'ko', BETWEEN_WORDS, 'sentenceKo');

  return out;
}

/** 책 한 권 전체의 낭독 대본 */
export function utterancesForBook(words: BookWord[]): Utterance[] {
  return words.flatMap((word, index) => utterancesForWord(word, index));
}

/** 각 단어가 대본의 몇 번째 발화에서 시작하는지 — 단어 단위 탐색용 */
export function wordStartIndexes(utterances: Utterance[]): number[] {
  const starts: number[] = [];
  let previous = -1;
  utterances.forEach((utterance, index) => {
    if (utterance.wordIndex !== previous) {
      starts.push(index);
      previous = utterance.wordIndex;
    }
  });
  return starts;
}
