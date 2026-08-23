# TODO

`mp-word` 작업 목록. 완료한 항목은 `[x]`로 표시하거나 아래 "완료" 섹션으로 옮깁니다.

최종 갱신: 2026-08-23

## 진행 중

### 데이터

- [ ] `Foundation Essential` 신규 권 편성 — `work/word_base.csv`에 483단어 준비 완료, `add_word_csv_by_books.py`로 `word_by_books.csv`에 반영
- [ ] `words` 테이블 대량 적재분(`work/word.db` 16.7MB → 69.7MB) 검증 후 `sqlite_db_to_csv.py`로 `source/`에 반영
- [ ] 한글 번역 오역 점검 — `sentences.csv`의 `ko_translation` / `ko_read_aloud` 전수 검토 (숫자 표기, 주어 오기 등)

### TOEIC MVP 교재 (`ref/epub/mp-word-toeic/mvp/`)

- [ ] `text.csv` 낭독 분량 축소 — `_3`(영영 설명) 슬롯에서 품사 설명과 `For example` 예시 제거 작업 마무리
- [ ] 커버 낭독(`cover`, `cover_t1`, `cover_t2`) 제거 결정 확정
- [ ] `en-output-1.fodt` 조판 정리 및 PDF 재출력
- [ ] `mvp.fodp` 슬라이드 갱신

### 이미지 자산

- [ ] `august` 아이콘 삭제 → `top` 아이콘 신규 작업 마무리 (`ref/tool/image_convert/img/` 및 `to_svg/_top/`)
- [ ] 완료된 SVG를 `mng_svg_asset.py`로 `word_svgs` 테이블 및 `assets/images/words/`에 반영

## 백로그

### 파이프라인 정리

- [ ] `work/word.db`를 `.gitignore`에 추가 — CSV가 정본이므로 70MB 바이너리를 추적할 이유 없음. 기존 히스토리 정리 방안도 함께 검토
- [ ] `.gitignore`에 LibreOffice 락 파일 패턴 추가 (`.~lock.*#`)
- [ ] `mng_svg_asset.py`의 하드코딩 절대경로 제거 — 환경변수 또는 저장소 루트 기준 상대경로로 전환
- [ ] `csv_to_sqlite_db.py` / `sqlite_db_to_csv.py`의 `if __name__` 주석 토글을 `argparse` 인자로 대체 (테이블명을 CLI로 지정)
- [ ] `WordRepository`의 f-string SQL을 파라미터 바인딩으로 교체
- [ ] 비정규화 `word` 컬럼 정합성 검사 스크립트 추가 — 모든 테이블에 대해 `word_id`가 가리키는 `words.word`와 일치하는지 확인
- [ ] `source/` CSV export 시 `word` 컬럼을 JOIN으로 채우고 import 시에는 무시하도록 변경 검토

### 앱

- [ ] Expo 템플릿 화면(`app/(tabs)/two.tsx`, `components/EditScreenInfo.tsx` 등) 제거
- [ ] 앱에서 소비할 데이터 형식 결정 — 번들 SQLite / JSON / 원격 API 중 선택
- [ ] 단어 카드 화면 (단어 · 발음 · 뜻 · 예문 · SVG 아이콘)
- [ ] 교재(book) 단위 학습 플로우 — `word_by_books`의 `book_name` / `word_order` 기반
- [ ] TTS 연동 — `text.csv`의 SSML 슬롯 구조 재사용
- [ ] 학습 진도 로컬 저장
- [ ] `npm test` 스크립트 설정 (`components/__tests__/StyledText-test.js`가 현재 실행되지 않음)

### 콘텐츠 확장

- [ ] `en_long_meanings` 커버리지 확대 (6,454 / `words` 155,561)
- [ ] `word_svgs` 커버리지 확대 (4,512)
- [ ] `pronunciations`의 `us` / `gb` 양쪽 누락분 채우기
- [ ] `words.is_banned` 필터링 기준 정리
- [ ] 상위 레벨 교재 편성 — 현재 `Entry` ~ `Core` 44권

## 완료

- [x] `ko_read_aloud` 컬럼 생성 및 정제 (괄호 제거, 아라비아 숫자 → 한글 발음)
- [x] `word_by_books`에 에센셜 누락분 추가
- [x] `word_csv_data_mng_py` 파이프라인 구축 (CSV ↔ SQLite 양방향)
