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

### 앱 — 책 보고 듣기

기본 골격은 구현되어 있다 (권 목록 → 책 보기 → 낭독). 남은 것:

- [ ] 반복 재생 옵션 (단어별 N회 / 권 전체 반복)
- [ ] 슬롯 단위 이어보기 — 지금은 단어 단위로만 위치를 저장한다
- [ ] 재생 속도 조절 여부 결정 — 지금은 시스템 설정을 따른다(listening-trainer 원칙).
      학습 앱 특성상 느린 재생 요구가 있을 수 있다
- [ ] 낭독 중 화면 꺼짐 방지 (`expo-keep-awake`)
- [ ] 개발 빌드 확인 — `react-native-tts` 도입으로 Expo Go 가 불가하다.
      실기기에서 Android 목소리 선택 / 엔진 동기화 / iOS 일시정지 동작 검증 필요
- [ ] 오프라인 엔진 실기기 검증 — Flite 는 웹(브라우저가 WASM 직접 실행)에서만 확인했다.
      네이티브는 숨은 WebView 경로라 개발 빌드에서 별도 확인이 필요하다
- [ ] 오프라인 엔진 자산 3.2MB(WASM)를 번들에 계속 둘지 검토
- [ ] 삽화(PNG) 지면 반영 — 지금은 단어 아이콘 SVG 만 들어간다
- [ ] `Entry` · `Introductory` 두 레벨의 다른 지면 구성 대응 (현재는 Beginner 이상 기준)
- [ ] 실기기에서 지면 여백·글자 크기 확인 (지금은 웹 375×812 로만 맞췄다)
- [ ] **반전 트레이스 아이콘 5개 다시 뽑기** — 캔버스 전체가 채워져 검은 덩어리로 보인다:
      `much` · `during` · `statistics` · `testimony` · `published`
- [ ] 아이콘 없는 단어 26개 채우기 (`vagina`, `native`, `becoming`, `absolutely`, `modest` 등)
- [ ] 아이콘 번들 용량(11.5MB) 줄이기 — potrace path 단순화 또는 원격 로딩 검토
- [ ] `npm test` 스크립트 설정 — 특히 `lib/script.ts` 의 대본 생성은 단위 테스트 가치가 크다
- [ ] 읽기 탭이 이어보기 위치 변경을 즉시 반영하도록 (`useFocusEffect` 등) —
      지금은 화면이 마운트된 채로 돌아오면 갱신되지 않을 수 있다

### 결제

검증은 **자체 서버·외부 구독 서비스 없이 `react-native-iap` 만** 쓰기로 했다.
Android 변조 우회 가능성은 감수한다 (AGENTS.md 2.5절).

- [ ] **스토어 구독 상품 등록** (`mpword.sub.weekly`) — App Store Connect / Play Console.
      주 단위 청구와 ₩500 가격이 각 스토어 정책·최소 금액에 맞는지 확인 필요
- [ ] `react-native-iap` 연동 — 구매 · 복원 · 유효 구매 조회
- [ ] 앱 시작·포그라운드 복귀에서 `needsRecheck()` → 스토어 조회 → `applyEntitlement()` /
      `clearEntitlement()` 연결 (지금은 호출부가 없다)
- [ ] 오프라인 조회 실패 시 캐시를 건드리지 않는지 확인 (유예가 그때 동작한다)
- [ ] 구독 만료·환불 시 잠금 복구 확인
- [ ] `devToggleSubscription()` 제거

### 콘텐츠 확장

- [ ] `en_long_meanings` 커버리지 확대 (6,454 / `words` 155,561)
- [ ] `word_svgs` 커버리지 확대 (4,512)
- [ ] `pronunciations`의 `us` / `gb` 양쪽 누락분 채우기
- [ ] `words.is_banned` 필터링 기준 정리
- [ ] 상위 레벨 교재 편성 — 현재 `Entry` ~ `Core` 44권

## 완료

- [x] 앱 기본 구현 — 권 목록 / 책 보기 / 낭독 (SSML 없이 순수 텍스트 + 실제 쉼)
- [x] TTS 를 listening-trainer 구성으로 이식 — react-native-tts, 언어별 목소리 선택,
      미리듣기, Android 엔진 동기화, 시스템 설정 열기, 오디오 세션, 웹 대체 구현
- [x] 구독 잠금 — Entry·Introductory 무료, 그 위는 잠금 + 구독 안내 화면
- [x] 더보기 탭 — 사용법 · 지면 보는 법 · 낭독 순서 · 레벨 · 수록 정보
- [x] 읽기 탭 레벨별 접기·펼치기 (접은 상태 저장)
- [x] 디자인 "집중" 스킴 적용 + 화면 모드(시스템/밝게/어둡게) 설정
- [x] 지면을 출판본 구성으로 변경 (한 단어 = 한 쪽, 낭독 위치로 자동 스크롤)
- [x] 오프라인 엔진 이식 — Flite(영어/WASM), 숨은 WebView 합성 호스트, 빠르기·음높이 조절
      (한국어 케이브는 도입했다가 제거 — 한국어는 시스템 TTS 로 읽는다)
- [x] 책 데이터 내보내기 파이프라인 (`npm run export-books`)
- [x] Expo 템플릿 화면 제거
- [x] `ko_read_aloud` 컬럼 생성 및 정제 (괄호 제거, 아라비아 숫자 → 한글 발음)
- [x] `word_by_books`에 에센셜 누락분 추가
- [x] `word_csv_data_mng_py` 파이프라인 구축 (CSV ↔ SQLite 양방향)
