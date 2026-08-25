#!/usr/bin/env bash
# 빌드된 릴리스 APK 를 연결된 안드로이드 기기에 설치한다.
#   npm run apk:install
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK="$ROOT/build/mp-word.apk"

if [ ! -f "$APK" ]; then
  echo "APK 가 없습니다. 먼저 'npm run apk' 를 실행하세요." >&2
  exit 1
fi

if ! command -v adb >/dev/null 2>&1; then
  export PATH="$PATH:${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools"
fi

if [ -z "$(adb devices | sed -n '2,$p' | grep -w device || true)" ]; then
  echo "연결된 기기가 없습니다. USB 디버깅을 확인하세요." >&2
  exit 1
fi

adb install -r "$APK"
adb shell monkey -p com.admin_mippum.mpword -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 && echo "앱 실행"
