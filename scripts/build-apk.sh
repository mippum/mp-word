#!/usr/bin/env bash
# 릴리스 APK 빌드 (macOS / Linux)
#   npm run apk
# 스토어용이 아니라 실기기 사이드로드용이다 — release 도 debug 키로 서명된다.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# JDK 17 — 시스템 java 가 구버전일 수 있어 Android Studio 번들 JBR 을 우선 쓴다.
if [ -z "${JAVA_HOME:-}" ] || ! "${JAVA_HOME}/bin/java" -version 2>&1 | grep -q '"17'; then
  for candidate in \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    "$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  do
    if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "${JAVA_HOME}/bin/java" ]; then
  echo "JDK 17 을 찾지 못했습니다. JAVA_HOME 을 직접 지정하세요." >&2
  exit 1
fi
echo "JAVA_HOME=$JAVA_HOME"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

# gitignore 되는 생성물이라 체크아웃 직후엔 비어 있다 (없으면 JS 번들 단계에서 실패).
if [ ! -f "$ROOT/assets/books/books.json" ]; then
  echo "assets/books/books.json 이 없어 먼저 생성합니다..."
  ( cd "$ROOT/ref/tool/word_csv_data_mng_py/scripts" && python3 export_book_json.py )
fi

# gradlew 가 SDK 위치를 찾는 경로.
if [ ! -f "$ROOT/android/local.properties" ]; then
  echo "sdk.dir=$ANDROID_HOME" > "$ROOT/android/local.properties"
fi

( cd "$ROOT/android" && ./gradlew assembleRelease "$@" )

# 산출물은 build/ 로 모은다 (gitignore).
mkdir -p "$ROOT/build"
cp "$ROOT/android/app/build/outputs/apk/release/app-release.apk" "$ROOT/build/mp-word.apk"

echo
echo "APK: $ROOT/build/mp-word.apk"
