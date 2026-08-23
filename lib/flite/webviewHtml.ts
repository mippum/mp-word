/**
 * 숨은 WebView(FliteSynthHost)가 로드하는 자체 완결형 HTML.
 *
 * 파일 접근 플래그 없이 동작하도록, glue(.js)/wasm 은 RN 이 주입한다:
 *  - RN → WebView : injectJavaScript 로 window.__flite* 함수를 호출
 *    (wasm 은 크므로 __fliteChunk 로 나눠 보내고 __fliteInit 에서 합친다)
 *  - WebView → RN : window.ReactNativeWebView.postMessage(JSON) → onMessage
 *
 * 합성 결과는 16-bit PCM WAV 를 base64 로 만들어 돌려주고, 네이티브가 expo-audio 로
 * 재생한다 (WebView 안에서 재생하지 않는 이유: 백그라운드/화면 꺼짐에서 오디오가 멈춤).
 */
export const FLITE_WEBVIEW_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<script>
(function () {
  var post = function (o) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {}
  };

  var glueSrc = null;      // 주입된 Emscripten glue 소스
  var factory = null;      // glue 의 default export (모듈 팩토리)
  var chunks = [];         // 조립 중인 wasm base64 조각
  var modules = {};        // voice 이름 -> 초기화된 Flite 모듈

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var out = new Uint8Array(len);
    for (var i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  window.__fliteGlue = function (src) { glueSrc = src; };
  window.__fliteReset = function () { chunks = []; };
  window.__fliteChunk = function (piece) { chunks.push(piece); };

  // 모아둔 wasm 조각으로 특정 voice 모듈을 초기화한다.
  window.__fliteInit = function (voice) {
    (async function () {
      try {
        if (modules[voice]) { post({ type: 'ready', voice: voice }); return; }
        if (!factory) {
          if (!glueSrc) throw new Error('glue 미주입');
          var url = URL.createObjectURL(new Blob([glueSrc], { type: 'text/javascript' }));
          factory = (await import(url)).default;
        }
        var bytes = b64ToBytes(chunks.join(''));
        chunks = [];
        // 이 glue 빌드는 Module.wasmBinary 를 읽지 않고 locateFile 이 준 URL 을 fetch 한다.
        // wasm 바이트로 blob URL 을 만들어 locateFile 로 넘기면 glue 가 그 blob 을 받아 로딩한다.
        // (import.meta.url 이 blob: 이라, locateFile 없이 두면 findWasmBinary 의
        //  new URL("...wasm", import.meta.url) 가 WebView 에서 "Invalid URL" 로 터진다.)
        var wasmUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/wasm' }));
        var mod = await factory({ locateFile: function () { return wasmUrl; } });
        if (mod._tts_init() !== 1) throw new Error('Flite init 실패');
        modules[voice] = mod;
        post({ type: 'ready', voice: voice });
      } catch (e) {
        post({ type: 'error', message: String((e && e.message) || e) });
      }
    })();
  };

  // 한 문장을 합성해 WAV(base64)로 돌려준다. 빈 결과는 base64:'' 로 표시.
  // rate/pitch(배수, 1=기본)는 합성 전에 적용한다 (Flite 는 합성 파형 자체를 바꾼다).
  window.__fliteSynth = function (id, voice, text, rate, pitch) {
    try {
      var mod = modules[voice];
      if (!mod) { post({ type: 'error', id: id, message: 'voice 미초기화: ' + voice }); return; }
      if (mod._tts_set_rate) mod._tts_set_rate(rate);
      if (mod._tts_set_pitch) mod._tts_set_pitch(pitch);
      var ptr = mod.stringToNewUTF8(text);
      var n;
      try { n = mod._tts_synth(ptr); } finally { mod._free(ptr); }
      if (n <= 0) { post({ type: 'wav', id: id, base64: '', sampleRate: 0 }); return; }
      var sr = mod._tts_sample_rate();
      var sp = mod._tts_samples();
      var pcm = mod.HEAP16.subarray(sp >> 1, (sp >> 1) + n);
      var wav = pcmToWavBase64(pcm, sr);
      mod._tts_clear();
      post({ type: 'wav', id: id, base64: wav, sampleRate: sr });
    } catch (e) {
      post({ type: 'error', id: id, message: String((e && e.message) || e) });
    }
  };

  function pcmToWavBase64(pcm, sampleRate) {
    var dataSize = pcm.length * 2;
    var buf = new ArrayBuffer(44 + dataSize);
    var v = new DataView(buf);
    function s(o, str) { for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); }
    s(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); s(8, 'WAVE');
    s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    s(36, 'data'); v.setUint32(40, dataSize, true);
    var o = 44;
    for (var i = 0; i < pcm.length; i++) { v.setInt16(o, pcm[i], true); o += 2; }
    // ArrayBuffer -> base64 (큰 문자열 대비 청크 단위로 fromCharCode)
    var bytes = new Uint8Array(buf);
    var bin = '';
    var CHUNK = 0x8000;
    for (var j = 0; j < bytes.length; j += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(j, j + CHUNK));
    }
    return btoa(bin);
  }


  post({ type: 'boot' });
})();
</script>
</body>
</html>`;
