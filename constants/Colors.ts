const tintColorLight = '#2f95dc';
const tintColorDark = '#7cc4f2';

export default {
  light: {
    text: '#11181c',
    /** 본문보다 한 단계 옅은 글자 — 발음기호, 보조 설명 */
    muted: '#5b6b73',
    background: '#fff',
    /** 지면(카드) 배경 */
    card: '#f7f7f4',
    border: '#e3e3dd',
    /** 낭독 중인 부분의 배경 */
    highlight: '#fff2b8',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ecedee',
    muted: '#9aa5ab',
    background: '#000',
    card: '#15181a',
    border: '#2a2f33',
    highlight: '#4a3d12',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};
