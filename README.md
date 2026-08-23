# mp-word (미쁨 영단어)

영어 단어 학습 데이터베이스와, 이를 소비하는 모바일 앱 · 교재를 함께 관리하는 저장소입니다.

- 15만 개 규모의 단어 데이터베이스 (발음 · 빈도 · 영영 뜻풀이 · 예문 · 한글 번역 · 삽화 SVG)
- CEFR 수준을 참고한 레벨별 교재 편성 (권당 69단어, 현재 44권)
- Expo 기반 모바일 앱 (개발 초기 단계)

## 구성

| 경로 | 내용 |
|---|---|
| `app/`, `components/`, `constants/`, `assets/` | Expo / React Native 앱 |
| `ref/tool/word_csv_data_mng_py/` | 단어 데이터 파이프라인 (CSV ↔ SQLite) |
| `ref/tool/` | 삽화 생성 · 이미지 변환 · GPT 프롬프트 등 제작 도구 |
| `ref/epub/` | 교재 원고 (TOEIC MVP, Introductory, Beginner) |
| `ref/` (그 외) | 원본 코퍼스 — NGSL, Oxford, Cambridge EVP, MDvoca, ncic_re_kr |

## 앱 실행

```bash
npm install
```

```bash
npm start
```

`npm run android`, `npm run ios`, `npm run web`으로 플랫폼을 지정해 실행할 수 있습니다.

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

`Entry` → `Introductory` → `Basic` → `Beginner` → `Elementary` → `Essential` → `Core`

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

## 문서

- [AGENTS.md](AGENTS.md) — 개발 · 에이전트 작업 가이드 (스키마, 명명 규칙, 주의사항)
- [TODO.md](TODO.md) — 진행 중 작업과 백로그
