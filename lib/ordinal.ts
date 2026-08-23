/**
 * 영어 서수 — 낭독의 "First Sentence." 안내에 쓴다.
 * 책이 한 권에 69단어라 100 미만만 다룬다.
 */
const ONES = [
  '',
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
  'Eleventh',
  'Twelfth',
  'Thirteenth',
  'Fourteenth',
  'Fifteenth',
  'Sixteenth',
  'Seventeenth',
  'Eighteenth',
  'Nineteenth',
];

const TENS_CARDINAL = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const TENS_ORDINAL = ['', '', 'Twentieth', 'Thirtieth', 'Fortieth', 'Fiftieth', 'Sixtieth', 'Seventieth', 'Eightieth', 'Ninetieth'];

/** 1 -> 'First', 69 -> 'Sixty-ninth'. 범위를 벗어나면 숫자를 그대로 돌려준다. */
export function ordinalWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return TENS_ORDINAL[tens];
  return `${TENS_CARDINAL[tens]}-${ONES[ones].toLowerCase()}`;
}
