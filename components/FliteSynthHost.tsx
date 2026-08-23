/**
 * FliteSynthHost 의 웹/기본 스텁 — 웹은 WebView 없이 브라우저가 직접 WASM 을 돌리므로
 * (lib/flite/synth.web.ts) 합성용 WebView 호스트가 필요 없다.
 * 네이티브 구현은 FliteSynthHost.native.tsx 가 대체 번들된다.
 */
export function FliteSynthHost() {
  return null;
}
