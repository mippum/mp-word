// Expo 기본 Metro 설정에 Flite 오프라인 엔진 에셋 확장자를 추가한다.
// - wasm: Flite WASM 바이너리 (숨은 WebView 에서 로드)
// - fliteglue: Emscripten glue(.js) 를 소스가 아닌 에셋으로 번들하기 위한 전용 확장자
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm', 'fliteglue');

module.exports = config;
