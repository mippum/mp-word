/**
 * 팔레트 — 민트 크롬 + 중성 지면.
 *
 * **앱 크롬(탭·책장·설정·더보기·구독)은 민트**, **책 지면은 중성**으로 나눠 둔다.
 * 지면은 출판된 전자책을 옮긴 것이라 종이처럼 흰 바탕에 먹색 활자를 유지해야 하고,
 * 낭독 하이라이트(노랑)가 화면에서 **유일한 채색**이어야 따라 읽기 쉽다.
 * 지면에 민트가 들어가면 그 신호가 약해진다.
 *
 * 그래서 색을 두 갈래로 나눈다.
 *
 *   크롬  background · card · border · accent · onAccent · tabIcon*   ← 민트
 *   지면  paper · text · muted · faint · rule · highlight            ← 중성
 *
 * 새 화면을 만들 때 배경은 `background`(크롬) 또는 `paper`(지면) 중에 고를 것.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

export type Palette = {
  /** 앱 화면 바탕 (민트) */
  background: string;
  /**
   * 아래쪽 바 — 탭바 · 재생 컨트롤.
   * 본문 바탕과 **진하기를 달리해** 화면이 한 덩어리로 보이지 않게 한다
   * (밝은 모드에서는 더 진하게, 어두운 모드에서는 더 밝게).
   */
  chrome: string;
  /** 맨 위 헤더 — `chrome` 보다 한 단계 더 준다 (화면의 머리라 가장 또렷하게) */
  header: string;
  /** 카드·타일 바탕 */
  card: string;
  /** 책 지면 바탕 — 민트를 섞지 않는다 */
  paper: string;
  /** 본문 글자 */
  text: string;
  /** 보조 글자 — 발음기호, 라벨, 캡션 */
  muted: string;
  /** 더 옅은 글자 — 비활성, 힌트 */
  faint: string;
  /** 테두리 (민트) */
  border: string;
  /** 지면의 구분 괘선 — 중성 */
  rule: string;
  /** 낭독 중 하이라이트 — 지면에서 유일한 채색 */
  highlight: string;
  /** 강조 (버튼·선택·진행) — 민트 */
  accent: string;
  /** 강조 위에 얹는 글자색 */
  onAccent: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

const light: Palette = {
  background: '#f1faf6',
  chrome: '#d5eee4',
  header: '#bfe3d3',
  card: '#ffffff',
  paper: '#ffffff',
  text: '#0d1a16',
  muted: '#5f6f6a',
  faint: '#9fb0aa',
  border: '#d2e7de',
  rule: '#d4d4d4',
  highlight: '#ffe066',
  accent: '#0e9b78',
  onAccent: '#ffffff',
  tabIconDefault: '#9fb0aa',
  tabIconSelected: '#0e9b78',
};

const dark: Palette = {
  background: '#06120f',
  chrome: '#112722',
  header: '#17352d',
  card: '#0e1b17',
  paper: '#000000',
  text: '#eef5f2',
  muted: '#97aca6',
  faint: '#66807a',
  border: '#1d332c',
  rule: '#333333',
  highlight: '#6b5300',
  accent: '#4fd1ab',
  onAccent: '#04120e',
  tabIconDefault: '#66807a',
  tabIconSelected: '#4fd1ab',
};

export const Palettes = { light, dark };

export default Palettes;
