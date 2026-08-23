# mp-word (미쁨 영단어)

**책을 보면서 듣는** 영어 단어 학습 앱과, 그 바탕이 되는 단어 데이터베이스를 함께 관리하는 저장소입니다.

종이책·PDF로 내는 『미쁨 영단어』 교재와 같은 내용을, 앱에서는 지면을 보여주면서
TTS로 낭독해 주고 지금 읽는 문장을 하이라이트하는 방식으로 따라갑니다.
단어 퀴즈 앱이 아니라 **리더 + 플레이어**입니다.

- 15만 개 규모의 단어 데이터베이스 (발음 · 빈도 · 영영 뜻풀이 · 예문 · 한글 번역 · 삽화 SVG)
- CEFR 수준을 참고한 레벨별 교재 편성 (권당 69단어, 현재 44권 3,004단어)
- Expo 기반 모바일 앱 — 책장에서 권을 고르고, 지면을 넘기며 낭독을 듣는다

## 구성

| 경로 | 내용 |
|---|---|
| `app/`, `components/`, `constants/`, `assets/` | Expo / React Native 앱 |
| `ref/tool/word_csv_data_mng_py/` | 단어 데이터 파이프라인 (CSV ↔ SQLite) |
| `ref/tool/` | 삽화 생성 · 이미지 변환 · GPT 프롬프트 등 제작 도구 |
| `ref/epub/` | 교재 원고 (TOEIC MVP, Introductory, Beginner) |
| `ref/` (그 외) | 원본 코퍼스 — NGSL, Oxford, Cambridge EVP, MDvoca, ncic_re_kr |

## 책 한 권의 구성

교재 한 권은 `word_by_books`의 `book_name` 하나이고, `word_order` 1~69가 지면 순서입니다.
단어 한 개(펼침면)는 다음 요소로 구성됩니다.

| 요소 | 예시 | 데이터 출처 |
|---|---|---|
| 예문 (영) + 순번 | `Don't drop the glass.` / `First Sentence.` | `sentences` |
| 키워드 + 철자 | `drop` / `D. R. O. P.` | `words` |
| 단어 아이콘 | (SVG) | `word_svgs` |
| 삽화 | (PNG) | 이미지 생성 도구 |
| 영영사전 뜻 | `'Drop' means to let something fall. …` | `en_long_meanings`, `simple_definitions` |
| 한글 뜻 | `떨어지다 / 하락하다 / 방울` | `sentences`, 뜻 데이터 |
| 한글 해석 | `유리잔 떨어뜨리지 마.` | `sentences.ko_translation` |

낭독 스크립트는 `ref/epub/mp-word-toeic/mvp/text.csv`에 `<권>_<순번>_<슬롯>` 키로 정리되어
있으며 `<break time='300ms'/>`, `<say-as interpret-as='characters'>` 같은 SSML 태그를 씁니다.

## 앱 실행

```bash
npm install
```

앱이 읽는 책 데이터(`assets/books/`)는 CSV에서 생성합니다. 생성물이라 저장소에 넣지 않으므로
처음 한 번은 반드시 실행해야 합니다.

```bash
npm run export-books
```

```bash
npm run web
```

네이티브는 개발 빌드가 필요합니다 (아래 낭독 항목 참고).

```bash
npm run android
```

### 낭독

TTS는 `react-native-tts`를 쓰고 **SSML은 사용하지 않습니다.** 교재 낭독 스크립트의
`<break time='300ms'/>`는 발화 사이의 실제 대기로, `<say-as interpret-as='characters'>`는
책 지면과 같은 `D. R. O. P.` 문자열로 대체합니다.

한국어 문장과 영어 문장을 각각 다른 목소리로 읽으며, 목소리는 설정 탭에서 언어별로 고를 수
있습니다(기본값 자동). 빠르기와 음높이는 기기의 시스템 음성 설정을 따릅니다.

> `react-native-tts`는 네이티브 모듈이라 **Expo Go에서는 동작하지 않습니다.**
> `npm run android`(= `expo run:android`)로 개발 빌드를 실행하세요. 웹은 개발 확인용으로
> 브라우저 음성으로 대체 동작합니다.

## 데이터 파이프라인

정본은 `ref/tool/word_csv_data_mng_py/source/*.csv`이고, `work/word.db`(SQLite)는 작업용 캐시입니다.

```
source/*.csv  ──csv_to_sqlite_db.py──▶  work/word.db  ──sqlite_db_to_csv.py──▶  source/*.csv
```

스크립트는 상대경로에 의존하므로 `scripts/` 안에서 실행합니다.

```bash
cd ref/tool/word_csv_data_mng_py/scripts && python csv_to_sqlite_db.py
```

### 데이터 현황

| 테이블 | 설명 | 행 수 |
|---|---|---|
| `words` | 단어 원본 | 155,561 |
| `pronunciations` | 미국식 · 영국식 발음 | 59,898 |
| `word_mpfpm` | 단어 빈도 | 33,104 |
| `simple_definitions` | 간단한 뜻풀이 | 29,949 |
| `sentences` | 예문 · 한글 번역 · 낭독 텍스트 | 25,943 |
| `en_long_meanings` | 영영 상세 뜻풀이 | 6,454 |
| `word_svgs` | 단어 삽화 | 4,512 |
| `word_by_books` | 교재별 단어 배치 | 3,004 |

## 교재 레벨

`word_by_books.book_name`은 `Foundation <레벨> <서수>` 형식입니다 (예: `Foundation Essential Fourth`).

쉬운 순서(권별 평균 빈도 기준)는 다음과 같습니다.

`Entry` → `Introductory` → `Beginner` → `Basic` → `Essential` → `Core` → `Elementary`

참고한 CEFR 기준:

| 레벨 | 설명 |
| - | - |
| **A1 (Beginner)**           | 기초 단계, 아주 간단한 문장과 표현 이해 가능      |
| **A2 (Elementary)**         | 일상적인 표현 이해 가능, 간단한 대화 가능        |
| **B1 (Intermediate)**       | 주요 내용을 이해, 의견을 간단히 설명 가능        |
| **B2 (Upper-Intermediate)** | 복잡한 문장 이해, 자세한 의사 표현 가능         |
| **C1 (Advanced)**           | 전문적, 학문적 내용 이해 가능, 유창하게 의사소통 가능 |
| **C2 (Proficient)**         | 거의 원어민 수준, 복잡한 글과 대화 완벽 이해 가능   |

## 참고 자료

- [NGSL – New General Service List Project](https://www.newgeneralservicelist.com/) — NGSL, TOEIC Service List, NAWL, NDL, BSL
- [Cambridge – English Vocabulary Profile (EVP)](https://www.englishprofile.org/wordlists/evp)
- Oxford corpus
- [google 단어모음](https://github.com/first20hours/google-10000-english)

## 관련 저장소

| 저장소 | 역할 |
|---|---|
| `mp-epub-foundation-words` | Foundation 시리즈 교재 원고 (Entry ~ Core). **책 내용의 정본** |
| `mp-pangaea/mobiles/listening-trainer` | 미쁨 듣기 트레이너. **TTS 구현의 참고 원본** (문장 낭독 · 하이라이트 · 플레이어 구조) |

## 문서

- [AGENTS.md](AGENTS.md) — 개발 · 에이전트 작업 가이드 (스키마, 명명 규칙, 주의사항)
- [TODO.md](TODO.md) — 진행 중 작업과 백로그
