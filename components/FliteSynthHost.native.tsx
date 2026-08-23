import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';

import {
  handleFliteMessage,
  markFliteUnavailable,
  registerFliteWebView,
} from '@/lib/flite/bridge.native';
import { FLITE_WEBVIEW_HTML } from '@/lib/flite/webviewHtml';

/**
 * 화면에 보이지 않는 Flite 합성용 WebView (앱 루트에 상주).
 * Hermes 가 WASM 을 못 돌려, 오프라인 영어 합성을 여기서 대신 수행한다.
 * 재생은 하지 않고(합성만) 결과 WAV 를 네이티브로 넘긴다 — bridge.native.ts 참고.
 *
 * react-native-webview 는 네이티브 모듈이라 **개발 빌드를 다시 만들어야**(`npm run android`)
 * 바이너리에 등록된다. 아직 재빌드 전(구 바이너리)이면 require 가 던지는데, 이때
 * 앱 전체가 죽지 않도록(=_layout 까지 무너지지 않도록) 방어해 null 을 렌더한다.
 * 이 경우 오프라인 엔진만 동작하지 않고, 사용 시 "합성기 미준비" 오류 토스트가 뜬다.
 */
let WebViewComponent: ComponentType<Record<string, unknown>> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebViewComponent = require('react-native-webview').WebView;
} catch {
  WebViewComponent = null;
}
// 네이티브 모듈이 없으면(구 빌드) 오프라인 요청이 조용히 멈추지 않고 즉시 안내하도록 알린다
if (!WebViewComponent) {
  markFliteUnavailable();
}

export function FliteSynthHost() {
  const WebView = WebViewComponent;
  if (!WebView) return null;
  return (
    <View style={styles.hidden} pointerEvents="none" collapsable={false}>
      <WebView
        ref={(w: unknown) => registerFliteWebView(w as never)}
        source={{ html: FLITE_WEBVIEW_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        // 소리는 네이티브(expo-audio)가 내므로 WebView 미디어 자동재생 설정은 불필요
        onMessage={(e: WebViewMessageEvent) => handleFliteMessage(e.nativeEvent.data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 0×0 은 일부 기기에서 렌더/실행이 최적화로 생략될 수 있어 1×1 로 숨긴다
  hidden: { position: 'absolute', width: 1, height: 1, left: -1000, top: -1000, opacity: 0 },
});
