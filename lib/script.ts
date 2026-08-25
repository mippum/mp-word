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
  /**
   * 한 슬롯이 여러 조각으로 나뉠 때 그 안에서의 순번 (0-based).
   * 지금은 영영 뜻만 문장 단위로 나뉜다 — 지면이 이 값으로 읽는 문장만 표시한다.
   */
  part?: number;
};

/** 문장 끝으로 볼 부호 */
const TERMINATORS = '.!?…';
/** 종결 부호 뒤에 따라붙어도 같은 문장으로 보는 닫는 부호 */
const CLOSERS = `'"’”)`;

/**
 * 영영 뜻처럼 여러 문장인 글을 문장 단위로 쪼갠다.
 *
 * **조각을 이어붙이면 원문과 정확히 같아야 한다** — 지면(`WordSpread`)이 같은 함수로 쪼개
 * 그리고, 낭독 중인 조각만 표시하기 때문이다. 한쪽만 고치면 하이라이트가 어긋난다.
 *
 * 종결 부호 뒤가 공백이나 글 끝일 때만 경계로 본다 (`3.14`, `a.m.` 이 쪼개지지 않게).
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    if (!TERMINATORS.includes(text[i])) continue;

    // 뒤따르는 종결·닫는 부호까지 이 문장에 포함시킨다 (`... 'drop the ball'.`)
    let end = i + 1;
    while (end < text.length && (TERMINATORS.includes(text[end]) || CLOSERS.includes(text[end]))) {
      end += 1;
    }
    const next = text[end];
    if (next !== undefined && !/\s/.test(next)) continue; // 문장 끝이 아니다

    // 뒤 공백까지 붙여 두면 이어붙였을 때 원문이 그대로 복원된다
    while (end < text.length && /\s/.test(text[end])) end += 1;

    out.push(text.slice(start, end));
    start = end;
    i = end - 1;
  }

  if (start < text.length) out.push(text.slice(start));
  return out.length > 0 ? out : [text];
}

const SHORT = 300;
const LONG = 600;
const BETWEEN_WORDS = 900;

/** 단어 하나의 낭독 대본. wordIndex 는 0-based, 순번 안내는 order 를 쓴다. */
export function utterancesForWord(word: BookWord, wordIndex: number): Utterance[] {
  const out: Utterance[] = [];
  const push = (
    text: string,
    lang: 'en' | 'ko',
    pauseAfterMs: number,
    slot: Slot,
    part?: number
  ) => {
    const trimmed = text.trim();
    if (trimmed) out.push({ text: trimmed, lang, pauseAfterMs, wordIndex, slot, part });
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

  // 3. 영영사전 뜻 — 문장 하나씩 읽는다 (지면도 읽는 문장만 표시한다)
  const definition = splitSentences(word.meaningEn).filter((part) => part.trim());
  definition.forEach((sentence, index) => {
    const last = index === definition.length - 1;
    push(sentence, 'en', last ? LONG : SHORT, 'meaningEn', index);
  });

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
