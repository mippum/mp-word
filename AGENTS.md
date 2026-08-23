# AGENTS.md

이 저장소에서 작업하는 코딩 에이전트를 위한 안내 문서입니다.

## 1. 저장소 개요

`mp-word`(미쁨 영단어)는 **영어 단어 학습 데이터베이스**와 이를 소비하는 **모바일 앱 / 교재**를 함께 관리하는 저장소입니다.

성격이 다른 두 축이 한 저장소에 있습니다.

| 영역 | 경로 | 상태 |
|---|---|---|
| **앱** | `app/`, `components/`, `constants/`, `assets/` | Expo 템플릿 단계. 실제 학습 화면 미구현 |
| **데이터 · 제작 도구** | `ref/` | 실질적인 작업 대부분이 여기서 진행됨 |

작업 요청이 들어오면 **어느 축인지 먼저 확인**하세요. 대부분의 요청은 `ref/` 쪽입니다.

## 2. 앱 (루트) — 책을 보고 듣는 앱

**이 앱의 형태: 교재(책)를 화면에 펼쳐 보면서 TTS 낭독을 듣는 앱입니다.**
`ref/epub/`에서 만드는 종이책·PDF와 같은 내용을, 앱에서는 지면 하이라이트와
낭독으로 따라가는 구조입니다. 단어 퀴즈 앱이 아니라 **리더 + 플레이어**입니다.

- Expo `~54.0.8` / React Native `0.81.4` / React `19.1.0` / TypeScript `~5.9.2`
- 라우팅: `expo-router` `~6.0.6` (파일 기반, `app/` 디렉터리)
- TTS: `expo-speech` — SSML 을 쓰지 않는다 (2.1 참고)
- 아이콘 렌더링: `react-native-svg`

### 구조

```
app/
├── _layout.tsx           ← 루트 Stack
├── (tabs)/
│   ├── index.tsx         ← 책장 (레벨별 권 목록, 이어보기 표시)
│   └── settings.tsx      ← 안내 + 정보
└── book/[slug].tsx       ← 책 보기 + 듣기 (지면 넘기기, 하이라이트, 재생 컨트롤)

lib/
├── books.ts              ← 번들 책 데이터 로더 (assets/books/)
├── script.ts             ← ★ 낭독 대본 생성 — SSML 을 순수 텍스트 + 실제 쉼으로 대체
├── ordinal.ts            ← 'First' ~ 'Sixty-ninth' (낭독의 순번 안내)
├── tts.ts                ← expo-speech 래퍼. 대본을 순차 재생, 발화 사이 실제 대기
├── player.ts             ← 전역 단일 플레이어 (usePlayer 훅)
└── progress.ts           ← 이어보기 위치 (네이티브 JSON 파일 / 웹 localStorage)

components/
├── WordSpread.tsx        ← 단어 한 개의 지면
├── WordIcon.tsx          ← 단어 아이콘 SVG (테마 색으로 tint)
└── PlaybackControls.tsx  ← 이전 / 재생·일시정지 / 다음
```

### 데이터

앱은 `assets/books/` 를 번들로 읽는다. 이 폴더는 **생성물이라 git 에 넣지 않는다**.

```bash
npm run export-books
```

`ref/tool/word_csv_data_mng_py/scripts/export_book_json.py` 가 `source/*.csv` 에서
`books.json`(2MB, 44권 3,004단어)과 `icons/<slug>.json`(합계 11.5MB)을 만든다.
아이콘을 한 파일로 두면 앱이 통째로 파싱하므로 권별로 쪼개고, Metro 가 동적 require 를
지원하지 않아 `icons/index.js` 정적 맵을 함께 생성한다.

### 실행

```bash
npm run web
```

```bash
npm run android
```

> 테스트 러너는 아직 설정되어 있지 않습니다(`react-test-renderer`만 devDependency에 있고 `test` 스크립트 없음).
> `components/__tests__/StyledText-test.js`는 실행되지 않는 상태입니다.

### 2.1 TTS — SSML 없이, `listening-trainer` 참고

**앱은 SSML 을 쓰지 않는다.** 교재 낭독 스크립트(`ref/epub/mp-word-toeic/mvp/text.csv`)는
SSML 태그를 쓰지만, 앱은 태그 없는 순수 텍스트만 엔진에 넘긴다. 태그는 이렇게 대체한다.

| text.csv (SSML) | 앱 |
|---|---|
| `<break time='300ms'/>` | 발화 사이 `pauseAfterMs` — `lib/tts.ts` 가 실제로 그만큼 쉰다 |
| `<say-as interpret-as='characters'>drop</say-as>` | `'D. R. O. P.'` 문자열 (`spelling_of()` 가 생성, **책 지면과 같은 표기**) |

이렇게 하면 엔진마다 SSML 지원이 달라도 결과가 같고, 지면에 인쇄된 문자열을 그대로 읽으므로
책과 앱의 내용이 어긋나지 않는다.

낭독 순서(`lib/script.ts`)는 text.csv 의 슬롯 1~7 과 같다. 슬롯은 `Slot` 타입이 되어
지면 하이라이트의 단위로도 쓰인다.

설계는 **`I:\github\mp-pangaea\mobiles\listening-trainer`** 를 참고했다. 그쪽에서 가져온 원칙:

- **전역 단일 플레이어** — 화면은 `usePlayer()` 로 구독만 하고, `lib/tts.ts` 를 직접 부르지 않는다
- **재생 파라미터 UI 를 두지 않는다** — 속도·음높이·목소리는 시스템 설정이 유일한 진실의 원천
  (앱 설정과 곱해져 혼란스러워지는 것을 막는다)
- **문장별 언어 전환** — 한/영이 섞이므로 발화마다 `en-US` / `ko-KR` 를 지정한다.
  단, 여기서는 감지할 필요가 없다 — 대본을 만들 때 이미 언어를 알고 있다

`listening-trainer` 와 다른 점:

- TTS 엔진이 `react-native-tts` 가 아니라 **`expo-speech`** 다. 네이티브 모듈이 아니라
  Expo Go 에서도 돌아가고 웹 구현이 딸려 온다. 대신 Android 엔진 선택은 못 한다
- 자유 텍스트가 아니라 **정해진 대본**을 읽으므로 문장 분리(`splitSentences`)가 필요 없다

주의할 제약:

- **Android 는 일시정지를 지원하지 않는다** (`supportsPause === false`).
  멈추면 읽던 단어의 처음부터 다시 읽는다
- 일시정지는 **발화 사이의 쉼 구간**에도 걸린다. `lib/tts.ts` 의 게이트가 이를 처리한다 —
  엔진만 멈추면 쉼 타이머는 계속 돌아 다음 문장으로 넘어가 버리기 때문이다

### 2.2 책 내용 — `mp-epub-foundation-words` 참고

앱이 보여줄 **책의 실제 구성**은
**`I:\github\mp-epub-foundation-words\ref\epub\mp-word-en-basic\yes24`** 를 참고합니다
(`en-basic-yes24-1.fodt` ~ `-4.fodt` + 각 PDF).

책 한 권 구성:

```
표지        Foundation Basic. / First. / 미쁨 영단어.
Introduction   단어를 문장으로 익히는 이유
How To Use     사용법
단어 69개      아래 구조가 69번 반복
```

단어 한 개(펼침면) 구성 — `text.csv`의 `_1`~`_7` 슬롯과 1:1로 대응합니다:

| 지면 요소 | 예시 | `text.csv` 슬롯 |
|---|---|---|
| 예문 (영) | `Don't drop the glass.` | `_1` |
| 순번 안내 | `First Sentence.` | `_1` |
| `Keyword` + 단어 | `drop` | `_2` |
| 단어 아이콘 SVG | (potrace 산출물, `word_svgs`) | — |
| 철자 | `D. R. O. P.` | `_2` (`say-as characters`) |
| 삽화 PNG | (이미지 생성 도구 산출물) | — |
| 영영사전 뜻 | `'Drop' means to let something fall. …` | `_3` |
| 한글 뜻 | `떨어지다 / 하락하다 / 방울` | `_4` |
| 한글 해석 | `유리잔 떨어뜨리지 마.` | `_5` |
| 예문 (영) | `Don't drop the glass.` | `_6` |
| 한글 해석 | `유리잔 떨어뜨리지 마.` | `_7` |

이 데이터는 전부 `word.db`에 있습니다 — 단어(`words`), 아이콘(`word_svgs`),
영영 뜻(`en_long_meanings` / `simple_definitions`), 예문·번역(`sentences`),
권·순번(`word_by_books`). **즉 책 한 권은 `word_by_books`의 `book_name` 하나이고,
`word_order` 1~69가 지면 순서입니다.**

`mp-epub-foundation-words/ref/epub/README.md`에 레벨별 권수·단어 수·가격 기획이 있습니다.

## 3. 데이터 파이프라인 (`ref/tool/word_csv_data_mng_py`)

이 저장소의 핵심입니다. **CSV가 정본(source of truth)**, SQLite는 작업용 캐시입니다.

```
source/*.csv  ──csv_to_sqlite_db.py──▶  work/word.db  ──sqlite_db_to_csv.py──▶  source/*.csv
                                            ▲
                            add_*_from_json.py │ (GPT 생성 결과 적재)
                                        work/*.json
```

### 디렉터리

| 경로 | 역할 |
|---|---|
| `source/` | **정본 CSV.** git으로 리뷰 가능한 형태 |
| `work/` | `word.db`(SQLite), `word_base.csv`(교재용 단어 목록 입력), GPT 생성 JSON |
| `scripts/` | 실행 스크립트 |
| `repository/word_repository.py` | `word.db` 접근 레이어 (`WordRepository`) |

### 스크립트

| 스크립트 | 하는 일 |
|---|---|
| `csv_to_sqlite_db.py` | `source/*.csv` → `work/word.db` |
| `sqlite_db_to_csv.py` | `work/word.db` → `source/*.csv` |
| `add_sentence_from_json.py` | GPT 생성 예문 JSON → DB |
| `add_en_long_meaning_repo_from_json.py` | GPT 생성 영영 뜻풀이 JSON → DB |
| `add_word_csv_by_books.py` | `work/word_base.csv`(`1_1,merger` 형식) → `source/word_by_books.csv`에 교재 배치 append |
| `mng_svg_asset.py` | `word_svgs` 테이블 ↔ `assets/images/words/_<word>/word_icon.svg` |

### 실행 방법

스크립트들은 `os.path.join('..', 'source', ...)` 같은 **상대경로를 쓰므로 반드시 `scripts/` 안에서 실행**해야 합니다.

```bash
cd ref/tool/word_csv_data_mng_py/scripts && python csv_to_sqlite_db.py
```

의존성: `pandas`, `pandas-stubs`, `uuid6` (`ref/tool/word_csv_data_mng_py/requirements.txt`)

### DB 스키마

모든 테이블의 PK는 **UUIDv7 문자열**(`uuid6.uuid7()`)이며, `words.id`를 `word_id`로 참조합니다.

| 테이블 | 컬럼 | 행 수(2026-08 기준) |
|---|---|---|
| `words` | `id, word, is_banned` | 155,561 |
| `pronunciations` | `id, word_id, word, language('us'\|'gb'), pronunciation` | 59,898 |
| `word_mpfpm` | `id, word_id, word, mpfpm` (빈도) | 33,104 |
| `simple_definitions` | `id, word_id, word, language, definition, read_aloud` | 29,949 |
| `sentences` | `id, word_id, word, sentence, ko_translation, ko_read_aloud` | 25,943 |
| `en_long_meanings` | `id, word_id, word, meaning, updated_at` | 6,454 |
| `word_svgs` | `id, word_id, word, mode, svg` | 4,512 |
| `word_by_books` | `id, word_id, word, book_name, word_order` | 3,004 |

### ⚠️ 비정규화된 `word` 컬럼 주의

`words`를 제외한 모든 테이블이 `word_id`와 **가독성용 `word` 컬럼을 중복 보유**합니다. 데이터를 수정할 때 둘이 어긋나지 않게 하세요.

정합성 확인:

```bash
cd ref/tool/word_csv_data_mng_py && python -c "import sqlite3;c=sqlite3.connect('work/word.db');print(c.execute('select count(*) from word_by_books b join words w on w.id=b.word_id where w.word<>b.word').fetchone())"
```

### 교재(book) 명명 규칙

`word_by_books.book_name`은 `Foundation <레벨> <서수>` 형식입니다.

- 레벨(쉬운 순): `Entry` → `Introductory` → `Beginner` → `Basic` → `Essential` → `Core` → `Elementary`
  (권별 평균 `mpfpm` 내림차순. `export_book_json.py` 가 데이터에서 이 순서를 계산한다)
- 서수: `First`, `Second`, … (`add_word_csv_by_books.py`의 `order_spell` 리스트)
- 권당 **69단어**가 기본 (`Entry` 45, `Introductory` 61은 예외)
- 현재 44권

`add_word_csv_by_books.py` 실행 전 파일 상단의 `BOOK_PRE_NAME`을 대상 레벨로 바꿔야 합니다.

## 4. 그 밖의 도구 (`ref/tool/`)

| 도구 | 역할 |
|---|---|
| `gpt_en_dict_py` | 영영 뜻풀이 생성 프롬프트/SQL |
| `gpt_simple_sentence_py` | 예문 생성 프롬프트/SQL |
| `gpt_pronunce_repr_py` | 발음 표기 생성 프롬프트/SQL |
| `word-image-gen`, `sentence-image-gen`, `image-gen` | 단어/예문 삽화 생성 |
| `image_convert` | 배경 제거 → BMP → potrace SVG 변환 (`img/` 하위에 단계별 산출물) |
| `convert_from_svg_py`, `gather_svgs_py` | SVG 후처리·수집 |
| `word_split` | NLTK 기반 어휘 분할/분석 |
| `check_work_contain_py` | 작업 누락 단어 점검 |
| `pdf-booklet` | PDF 소책자 조판 |

`gpt_*` 도구는 공통 패턴입니다: `origin_words.txt` → `gen_prompt.py`로 프롬프트 생성 → 결과를 `gpt_gen/`에 저장 → `gen_sql.py`로 SQL 변환.

## 5. 원본 코퍼스 (`ref/`)

읽기 전용 참조 자료입니다. **수정하지 마세요.**

- `NGSL - New General Service List Project/` — NGSL, TOEIC Service List, NAWL, NDL, BSL
- `oxford corpus/`, `Cambridge – English Vocabulary Profile (EVP)/`, `MDvoca/`, `ncic_re_kr/`

## 6. 교재 제작 (`ref/epub/`)

- `mp-word-toeic/mvp/` — TOEIC MVP. `text.csv`(TTS 낭독 스크립트), `en-output-1.fodt`(LibreOffice Writer), `mvp.fodp`(Impress), `arrange-1.csv`
- `mp-word-en-Introductory/`, `mp-word-en-beginner/` — JSON 기반 콘텐츠

`text.csv`는 `<키>,<SSML 텍스트>` 2열 구조이며 `<break time='300ms'/>`, `<say-as interpret-as='characters'>` 같은 **SSML 태그를 포함**합니다. 키는 `<권>_<단어순번>_<슬롯>` 형식:

| 슬롯 | 내용 |
|---|---|
| `_1` | 예문 + 순번 안내 |
| `_2` | 키워드 + 스펠링 |
| `_3` | 영영 설명 |
| `_4` | 한글 뜻 |
| `_5` | 한글 해석 + 예문 |
| `_6` | 예문(영) |
| `_7` | 예문(한) |

`.fodt` / `.fodp`는 LibreOffice **flat XML** 포맷이라 텍스트 diff는 가능하지만 수만 줄 단위로 바뀝니다. 에이전트가 직접 편집하지 말고 LibreOffice에서 작업하세요.

## 7. 작업 규칙

### 하지 말 것

- `ref/` 하위 **원본 코퍼스 수정** — 읽기 전용입니다
- `.fodt` / `.fodp` 직접 편집
- `work/word.db`를 정본처럼 취급하기 — 정본은 `source/*.csv`
- 요청 없이 `git commit` / `git push`

### 할 것

- 데이터 수정 후 `word_id` ↔ `word` 정합성 확인
- 새 PK가 필요하면 `uuid6.uuid7()` 사용 (다른 UUID 버전 금지)
- CSV는 UTF-8, `newline=''`로 열기 (기존 스크립트 관례)
- 커밋 메시지는 기존 관례를 따라 한국어 `feat: ...` 형식

### 알려진 함정

1. **하드코딩된 절대경로** — `mng_svg_asset.py`의 `asset_path`, `greenydot_word_path`가 머신별로 주석 토글됩니다
2. **`if __name__` 블록 주석 토글** — 실행할 테이블을 주석 해제로 고릅니다. diff에 노이즈가 생기니 커밋 전 원복 여부를 확인하세요
3. **`work/word.db`가 git 추적 중** (약 70MB) — 커밋마다 히스토리가 비대해집니다
4. **`WordRepository`의 SQL이 f-string 문자열 결합** — 로컬 전용 도구라 현재는 허용되지만 신규 코드는 파라미터 바인딩을 쓰세요
5. **줄바꿈** — 저장소가 LF/CRLF 혼용 경고를 냅니다. CSV 편집 시 전체 파일이 diff로 잡히지 않게 주의하세요

## 8. 관련 저장소

| 저장소 | 역할 | 이 저장소와의 관계 |
|---|---|---|
| `I:\github\mp-epub-foundation-words` | Foundation 시리즈 교재 원고 (Entry ~ Core) | **책 내용의 정본.** 앱이 보여줄 지면 구성의 기준 |
| `I:\github\mp-pangaea\mobiles\listening-trainer` | 미쁨 듣기 트레이너 (Expo + react-native-tts) | **TTS 구현의 참고 원본.** 문장 낭독·하이라이트·플레이어 구조 |
| `greenydot_flight_api` | 웹 정적 자산 호스팅 | `mng_svg_asset.py`가 여기서 SVG를 수집 |

세 저장소는 별개로 관리됩니다. 참고는 하되 **경로를 코드에 하드코딩하지 마세요.**

## 9. 관련 문서

- [README.md](README.md) — 프로젝트 소개, 레벨 체계, 출처
- [TODO.md](TODO.md) — 진행 중 작업과 백로그
- [CLAUDE.md](CLAUDE.md) — Claude Code용 진입점 (이 문서를 가리킴)
