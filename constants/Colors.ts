/**
 * 팔레트 — "집중" 스킴.
 *
 * 거의 무채색으로 두고 **채색은 하이라이트 하나뿐**이다. 그 노란색은 오직
 * "지금 낭독 중"만 뜻하므로, 장시간 낭독을 따라가는 동안 눈이 찾을 곳이 하나로 고정된다.
 * 다른 곳에 색을 더하면 이 신호가 약해지니 주의할 것.
 *
 * 지면 구성은 출판된 전자책(`mp-word-en-beginner/yes24`)을 그대로 따르되,
 * 책의 초록(`#77bc65`)은 이 스킴에서 무채색 괘선으로 바꿨다.
 * 책과 같은 초록을 쓰고 싶으면 `accent` 와 `rule` 만 그 값으로 바꾸면 된다.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

export type Palette = {
  /** 화면 바탕 */
  background: string;
  /** 지면(카드) 바탕 */
  card: string;
  /** 본문 글자 */
  text: string;
  /** 보조 글자 — 발음기호, 라벨, 캡션 */
  muted: string;
  /** 더 옅은 글자 — 비활성, 힌트 */
  faint: string;
  /** 테두리 */
  border: string;
  /** 지면의 구분 괘선 (전자책의 초록 괘선 자리) */
  rule: string;
  /** 낭독 중 하이라이트 — 화면에서 유일한 채색 */
  highlight: string;
  /** 강조 (버튼·선택 표시) — 집중 스킴에서는 본문색과 같은 무채색 */
  accent: string;
  /** 강조 위에 얹는 글자색 */
  onAccent: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

const light: Palette = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#0a0a0a',
  muted: '#737373',
  faint: '#a3a3a3',
  border: '#e5e5e5',
  rule: '#d4d4d4',
  highlight: '#ffe066',
  accent: '#0a0a0a',
  onAccent: '#ffffff',
  tabIconDefault: '#a3a3a3',
  tabIconSelected: '#0a0a0a',
};

const dark: Palette = {
  background: '#000000',
  card: '#0d0d0d',
  text: '#fafafa',
  muted: '#a3a3a3',
  faint: '#737373',
  border: '#262626',
  rule: '#333333',
  highlight: '#6b5300',
  accent: '#fafafa',
  onAccent: '#0a0a0a',
  tabIconDefault: '#737373',
  tabIconSelected: '#fafafa',
};

export const Palettes = { light, dark };

export default Palettes;
