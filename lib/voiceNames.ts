import type { Utterance } from './script';

type SentenceLang = Utterance['lang'];

/**
 * Android TTS 목소리 표시 이름 매핑.
 * Android 는 목소리에 사람이 읽을 이름이 없어(id = "ko-kr-x-ism-local" 같은 코드)
 * 정해둔 이름 풀에서 id 해시로 하나를 골라 붙인다.
 * - 결정적: 같은 id 는 항상 같은 이름 (실행/기기 재시작과 무관)
 * - 목소리가 추가/삭제되어도 기존 목소리의 이름은 바뀌지 않는다
 * - 한국어 목소리는 한국 이름, 영어 목소리는 영어 이름 (성 없이, 중성적인 이름만)
 * 단, 이름이 겹치면 id 정렬 순서로 "지우 2" 처럼 번호가 붙는데, 겹치는 목소리
 * 구성이 바뀌면 번호는 달라질 수 있다 (드묾).
 */

// 중성적인(성별 안 드러나는) 순우리말 계열 이름 40개. 성은 쓰지 않는다.
const KO_NAMES = [
  '지우',
  '하늘',
  '바다',
  '라온',
  '시온',
  '다온',
  '노을',
  '아람',
  '로운',
  '온유',
  '이든',
  '새벽',
  '한별',
  '가람',
  '나래',
  '슬기',
  '보람',
  '한결',
  '벼리',
  '여울',
  '윤슬',
  '마루',
  '도담',
  '은결',
  '초롱',
  '보름',
  '미르',
  '두리',
  '나눔',
  '늘봄',
  '아침',
  '소망',
  '다슬',
  '바람',
  '이슬',
  '가을',
  '별하',
  '하람',
  '시내',
  '봄',
];

// 중성적인(unisex) 영어 이름 40개. 성(last name)은 쓰지 않는다.
const EN_NAMES = [
  'Alex',
  'Sam',
  'Jordan',
  'Taylor',
  'Morgan',
  'Casey',
  'Riley',
  'Avery',
  'Quinn',
  'Jamie',
  'Charlie',
  'Rowan',
  'Skyler',
  'Sage',
  'River',
  'Reese',
  'Finley',
  'Emerson',
  'Dakota',
  'Hayden',
  'Peyton',
  'Parker',
  'Cameron',
  'Drew',
  'Elliot',
  'Kai',
  'Lennon',
  'Marley',
  'Micah',
  'Oakley',
  'Phoenix',
  'Remy',
  'Robin',
  'Shiloh',
  'Tatum',
  'Blake',
  'Devon',
  'Ellis',
  'Frankie',
  'Harper',
];

/** FNV-1a 32비트 해시 — 의존성 없이 결정적 인덱스를 만들기 위한 용도 */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** id 하나에 대한 기본 이름 (충돌 처리 전) */
export function friendlyVoiceName(id: string, lang: SentenceLang): string {
  const pool = lang === 'ko' ? KO_NAMES : EN_NAMES;
  return pool[fnv1a(id) % pool.length];
}

/**
 * 목록 전체에 이름을 부여한다. 같은 이름이 여러 목소리에 걸리면
 * id 정렬 순으로 "이름 2", "이름 3" … 번호를 붙여 구분한다 (첫 번째는 번호 없음).
 */
export function assignFriendlyNames<T extends { id: string }>(
  voices: T[],
  lang: SentenceLang
): (T & { name: string })[] {
  const byName = new Map<string, T[]>();
  for (const v of voices) {
    const name = friendlyVoiceName(v.id, lang);
    const group = byName.get(name);
    if (group) group.push(v);
    else byName.set(name, [v]);
  }
  const nameOf = new Map<string, string>();
  for (const [name, group] of byName) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((v, i) => {
      nameOf.set(v.id, i === 0 ? name : `${name} ${i + 1}`);
    });
  }
  return voices.map((v) => ({ ...v, name: nameOf.get(v.id) ?? v.id }));
}
