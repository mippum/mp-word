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
- [ ] **완독 표시** — 끝까지 읽으면 이어보기 위치가 0 으로 돌아가 책장에서 '안 읽음'으로 보인다.
      완독 여부를 따로 저장해야 100%(또는 '다 읽음')를 보여줄 수 있다
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

#### 연동 전에 화면부터 (SDK 없이 지금 할 수 있다)

- [ ] **복원 버튼** — 애플이 구독 앱에 요구한다. 없으면 심사에서 거절될 수 있고,
      기기를 바꾼 사용자가 권한을 되찾을 방법이 없다
- [ ] **가격을 스토어에서 받아 표시** — 지금 `PLAN.label` 이 `'주 500원'` 으로 하드코딩돼 있다.
      실제 가격은 스토어가 지역·통화·세금에 맞춰 정하므로 `localizedPrice` 를 써야 한다
      (심사 지적 대상). 하드코딩 값은 폴백으로만 남긴다
- [ ] **약관 · 개인정보처리방침 링크** 를 구독 화면에 추가

#### 연동

- [ ] **스토어 구독 상품 등록** (`mpword.sub.weekly`) — App Store Connect / Play Console.
      주 단위 청구와 ₩500 가격이 각 스토어 정책·최소 금액에 맞는지 확인 필요
- [ ] `react-native-iap` 연동 — 구매 · 복원 · 유효 구매 조회
- [ ] 앱 시작·포그라운드 복귀에서 `needsRecheck()` → 스토어 조회 → `applyEntitlement()` /
      `clearEntitlement()` 연결 (지금은 호출부가 없다)
- [ ] `devToggleSubscription()` 제거

#### 테스트 환경

두 단계로 나눈다 — 스토어 없이 로컬로 로직을 잡고, 그다음 샌드박스로 실제 흐름을 본다.

- [ ] **iOS 로컬** — Xcode `.storekit` Configuration File 로 상품을 정의하면
      App Store Connect 없이 시뮬레이터에서 구매가 돈다. 갱신을 초 단위로 당기고
      환불·만료·결제 실패를 강제로 일으킬 수 있어 반복이 가장 빠르다
- [ ] **iOS 샌드박스** — App Store Connect 의 샌드박스 테스터 계정 + TestFlight/개발 빌드
- [ ] **Android** — Play Console 라이선스 테스터 + **내부 테스트 트랙**.
      반드시 **Play 스토어 링크로 설치**해야 한다 (사이드로드하면 결제가 동작하지 않는다)
- [ ] 주 단위 구독은 양쪽 다 갱신 주기가 분 단위로 압축된다.
      **정확한 압축 시간과 자동 갱신 횟수 상한은 정책이 자주 바뀌므로 각 스토어 문서에서 확인할 것**

#### 만료는 어떻게 만드나

**샌드박스 구독은 가만두면 만료되지 않는다** — 자동 갱신이라 계속 되살아난다.
만료 상태를 인위적으로 만들어야 한다.

- [ ] **iOS — StoreKit Config 로** (가장 편하다). Xcode → Debug → StoreKit → Manage Transactions
      에서 구독을 직접 만료시키거나, 자동 갱신을 끄거나, 환불·결제 실패를 강제할 수 있다
- [ ] **iOS — 샌드박스로** 해야 한다면: 기기 설정 → App Store → 샌드박스 계정에서 구독 취소 후
      한 주기 대기, 또는 갱신 한도를 소진시킨다
- [ ] **Android** — Play 스토어 앱 → 구독 → 취소 후 압축된 주기 대기.
      Play Console → 주문에서 환불·해지하면 즉시 무효화된다

만료 판정은 대부분 **로컬 로직**이라 테스트를 두 갈래로 나누는 편이 실용적이다.

| | 무엇을 보나 | 어떻게 |
|---|---|---|
| A. 스토어 연동 | 스토어가 "유효한 구매 없음" 을 줄 때 `clearEntitlement()` 가 불리는가 | 샌드박스 / StoreKit Config |
| B. 만료·유예 로직 | `expiresAt` 이 지났을 때 언제 잠기는가 | **스토어 없이** 캐시 값만 조작 |

- [ ] A 만 샌드박스로 확인한다. 유예 경계처럼 시간이 오래 걸리는 조합을 샌드박스로 재현하려
      애쓸 필요가 없다
- [x] B 는 캐시 `expiresAt` 을 바꿔가며 이미 확인했다 —
      만료 1일 전 / 만료 1일 지남(유예 안) → 잠긴 권 0, 만료 4일 지남(유예 초과) → 42

> ⚠️ **만료된 구독은 조회 결과에서 그냥 사라진다.** iOS `Transaction.currentEntitlements` 도
> Android `queryPurchasesAsync()` 도 유효한 것만 돌려주지, "만료됨" 항목을 주지 않는다.
> 그러니 **"목록에 없음 = 권한 없음 → `clearEntitlement()`"** 로 처리해야 하고,
> 이때 **조회 실패(오프라인)** 와 **조회 성공 + 빈 목록** 을 반드시 구분해야 한다.

#### 확인할 시나리오

| 상황 | 기대 |
|---|---|
| 첫 구매 | `applyEntitlement()` → 잠금 해제 |
| 앱 재시작 | `needsRecheck()` → 조회 → 상태 유지 |
| 자동 갱신 | `expiresAt` 갱신 |
| 해지 후 만료 | `clearEntitlement()` → 다시 잠김 |
| 환불 | 잠김 |
| 재설치 · 기기 변경 | 복원으로 권한 회복 |
| 결제창 닫음 | 오류 아님, 잠금 유지 |
| **Android 보류 결제** | 완료 전까지 권한을 주면 **안 된다** (편의점 결제 등) |
| **비행기 모드** | 조회 실패 → **캐시 그대로** → 유예 안이면 열림, 초과면 잠김 |

- [ ] 위 표를 iOS · Android 각각에서 훑기
- [ ] 마지막 두 줄을 특히 볼 것 — 비행기 모드에서 실수로 `clearEntitlement()` 를 부르면
      돈 낸 사람이 오프라인에서 잠긴다
- [ ] 만료 · 유예 · `needsRecheck()` 경계는 순수 함수라 유닛 테스트로 덮을 것
      (테스트 러너가 아직 없다 — 이때 함께 붙인다)

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
- [x] 앱 크롬을 민트 테마로 (책 지면은 중성 유지 — `paper` 토큰 분리)
- [x] 읽기 탭 첫 실행 시 전부 접힌 상태로 시작 (`collapsedLevels: null` 센티널)
- [x] 영영 뜻을 문장 단위로 낭독 + 읽는 문장만 표시
- [x] 지면이 길 때 내용이 잘리던 버그 수정 (가로 리스트에서 지면 높이를 재서 지정)
- [x] 일시정지 중 이전·다음 단어 이동이 안 되던 버그 수정
- [x] 표지마다 읽은 분량 표시 (아래쪽 띠 + 백분율)
- [x] 읽기 탭을 표지 나열형 책장으로 (권차 `1st` 표기 + 책 모양 타일)
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
