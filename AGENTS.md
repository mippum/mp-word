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

## 2. 앱 (루트)

- Expo `~54.0.8` / React Native `0.81.4` / React `19.1.0` / TypeScript `~5.9.2`
- 라우팅: `expo-router` `~6.0.6` (파일 기반, `app/` 디렉터리)
- 현재 `app/(tabs)/index.tsx`, `two.tsx`, `modal.tsx` 등 **Expo 기본 템플릿 그대로**입니다.

```bash
npm start
```

```bash
npm run android
```

```bash
npm run web
```

> 테스트 러너는 아직 설정되어 있지 않습니다(`react-test-renderer`만 devDependency에 있고 `test` 스크립트 없음). `components/__tests__/StyledText-test.js`는 실행되지 않는 상태입니다.

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

- 레벨: `Entry` → `Introductory` → `Basic` → `Beginner` → `Elementary` → `Essential` → `Core`
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

## 8. 관련 문서

- [README.md](README.md) — 프로젝트 소개, 레벨 체계, 출처
- [TODO.md](TODO.md) — 진행 중 작업과 백로그
- [CLAUDE.md](CLAUDE.md) — Claude Code용 진입점 (이 문서를 가리킴)
