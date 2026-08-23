# CLAUDE.md

이 프로젝트의 에이전트 안내는 **[AGENTS.md](AGENTS.md)** 에 있습니다. 작업 전에 먼저 읽어주세요.

요약:

- `mp-word`(미쁨 영단어) — **책을 보면서 듣는** 영어 단어 학습 앱 + 그 바탕이 되는 단어 DB + 교재 제작 저장소
- 앱은 단어 퀴즈가 아니라 **리더 + 플레이어**입니다. 교재 지면을 보여주면서 TTS로 낭독하고 현재 문장을 하이라이트합니다
- 실질적인 작업 대부분은 `ref/` 하위 (데이터 파이프라인, 교재)에서 진행됩니다. 루트의 Expo 앱은 아직 템플릿 단계입니다
- 데이터 정본은 `ref/tool/word_csv_data_mng_py/source/*.csv`, `work/word.db`는 작업용 캐시입니다

## 참고 저장소 (읽기 전용)

앱 작업 전에 아래를 먼저 읽으세요. AGENTS.md 2.1 · 2.2 · 2.3절에 요약이 있습니다.

- **TTS**: `I:\github\mp-pangaea\mobiles\listening-trainer` — 특히 `CLAUDE.md`, `lib/tts.ts`, `lib/sentences.ts`, `lib/player.ts`, `app/reading.tsx`
- **책 내용**: `I:\github\mp-epub-foundation-words\ref\epub\mp-word-en-basic\yes24` — `en-basic-yes24-*.fodt` / `.pdf`

두 저장소는 별개 프로젝트입니다. 참고만 하고 **경로를 코드에 하드코딩하지 마세요.**

## ⛔ git 은 건드리지 말 것

**git 은 사용자가 직접 다룹니다.** `git add` · `git rm`(`--cached` 포함) · `git commit` ·
`git restore` · `git checkout` · `git reset` 등 **저장소 상태를 바꾸는 명령은 실행하지 마세요.**
필요하면 명령을 알려주기만 하고, 실행은 사용자에게 맡기세요.

파일을 지울 때도 `rm` 만 쓰고 인덱스는 그대로 둡니다.
`git status` / `git diff` / `git log` 같은 조회 전용 명령은 써도 됩니다.

## Claude Code 사용 시 참고

- **응답 언어**: 한국어
- **커밋 메시지**: 요청받으면 기존 관례대로 한국어 `feat: ...` 형식으로 **문구만** 제안 (직접 커밋 금지)
- **셸**: Windows / PowerShell 기본. POSIX 스크립트가 필요하면 Bash 도구 사용
- **파이썬 스크립트 실행**: 상대경로 의존성 때문에 반드시 `ref/tool/word_csv_data_mng_py/scripts/` 안에서 실행

  ```bash
  cd ref/tool/word_csv_data_mng_py/scripts && python csv_to_sqlite_db.py
  ```

- **대용량 파일 주의**: `work/word.db`(~70MB), `.fodt`/`.fodp`(수만 줄 flat XML)는 통째로 읽지 말고 필요한 부분만 조회하세요. DB는 `sqlite3`로 쿼리하는 편이 낫습니다
- **읽기 전용**: `ref/` 하위 원본 코퍼스(NGSL, Oxford, Cambridge EVP, MDvoca, ncic_re_kr)는 수정 금지

세부 규칙 · 스키마 · 명명 규칙 · 알려진 함정은 [AGENTS.md](AGENTS.md)를 참고하세요.
