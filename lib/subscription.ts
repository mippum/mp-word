/**
 * 구독 권한.
 *
 * Entry · Introductory 두 권은 맛보기로 열어 두고, 그 위 레벨은 구독해야 열린다.
 *
 * ## 검증 방식
 *
 * **자체 서버도 외부 구독 관리 서비스도 쓰지 않는다.** `react-native-iap` 로 스토어에
 * 직접 물어보고, 그 결과를 여기에 캐시한다.
 *
 *   iOS      StoreKit 2 의 `Transaction.currentEntitlements` — 애플이 서명한 것을
 *            StoreKit 이 기기에서 검증한다
 *   Android  Play Billing 의 `queryPurchasesAsync()` — 구글 서명을 앱에 심은 공개키로 검증
 *
 * Android 는 공개키가 앱 안에 있어 루팅·리패키징으로 우회될 수 있다. **이 위험은 감수하기로
 * 한 결정이다** (주 500원짜리 앱에서 서버 운영비가 더 크다). 서버 검증으로 올리고 싶어지면
 * `applyEntitlement()` 를 서버 응답으로 채우도록 바꾸면 되고, 그 위 코드는 그대로다.
 *
 * ## 캐시가 필요한 이유
 *
 * 이 앱은 콘텐츠와 오프라인 TTS 를 모두 품고 있어 인터넷 없이도 쓸 수 있다. 그때는 스토어에
 * 물어볼 수 없으므로 마지막으로 확인한 권한을 만료 시각과 함께 들고 있어야 한다.
 * 자동 갱신 구독은 조용히 갱신되는데 갱신 시점에 오프라인이면 `expiresAt` 이 낡아 보이므로,
 * 만료 뒤에도 GRACE_MS 만큼은 열어 준다 (돈 낸 사람을 잘못 막는 쪽이 더 나쁘다).
 */
import { useSyncExternalStore } from 'react';

import { createJsonStore } from './jsonStore';

export const PLAN = {
  priceKrw: 500,
  /** 청구 주기 */
  period: '주',
  label: '주 500원',
  /** 스토어에 등록할 구독 상품 id (아직 미등록) */
  productId: 'mpword.sub.weekly',
} as const;

/** 구독 없이 볼 수 있는 레벨 (쉬운 두 단계) */
export const FREE_LEVELS: readonly string[] = ['Entry', 'Introductory'];

/** 만료 뒤 유예 — 갱신 확인을 못 한 채 잠기는 것을 막는다 */
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** 이 시간이 지나면 스토어에 다시 물어본다 */
const RECHECK_AFTER_MS = 6 * 60 * 60 * 1000;

type Entitlement = {
  /** 현재 구독 기간이 끝나는 시각 (ISO 8601). null 이면 권한 없음 */
  expiresAt: string | null;
  /** 스토어에 마지막으로 물어본 시각 (ISO 8601) */
  lastVerifiedAt: string | null;
  /** 어떤 상품으로 열렸는지 — 상품이 여러 개가 되면 쓴다 */
  productId: string | null;
};

const EMPTY: Entitlement = { expiresAt: null, lastVerifiedAt: null, productId: null };

const store = createJsonStore<Entitlement>('subscription.json', 'mp-word:subscription', EMPTY);

let cache: Entitlement = store.read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function save(next: Entitlement) {
  cache = next;
  store.write(next);
  emit();
}

export function isSubscribed(): boolean {
  if (!cache.expiresAt) return false;
  const expires = Date.parse(cache.expiresAt);
  if (Number.isNaN(expires)) return false;
  return Date.now() < expires + GRACE_MS;
}

/** 만료가 지나 유예로만 열려 있는 상태인지 (안내 문구용) */
export function isInGracePeriod(): boolean {
  if (!cache.expiresAt) return false;
  const expires = Date.parse(cache.expiresAt);
  return !Number.isNaN(expires) && Date.now() >= expires && isSubscribed();
}

export function entitlement(): Entitlement {
  return cache;
}

/** 스토어에 다시 물어봐야 하는지 — 앱 시작/포그라운드 복귀에서 확인한다 */
export function needsRecheck(): boolean {
  if (!cache.lastVerifiedAt) return true;
  const last = Date.parse(cache.lastVerifiedAt);
  if (Number.isNaN(last)) return true;
  if (Date.now() - last > RECHECK_AFTER_MS) return true;
  // 만료가 지났으면 갱신됐는지 확인해야 한다
  const expires = cache.expiresAt ? Date.parse(cache.expiresAt) : NaN;
  return !Number.isNaN(expires) && Date.now() >= expires;
}

/**
 * 스토어 조회 결과를 반영한다.
 * `react-native-iap` 로 얻은 유효 구매의 만료 시각을 넘긴다.
 */
export function applyEntitlement(expiresAt: Date, productId = PLAN.productId): void {
  save({
    expiresAt: expiresAt.toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    productId,
  });
}

/** 스토어에 유효한 구매가 없었다 — 해지·환불·미구독 */
export function clearEntitlement(): void {
  save({ ...EMPTY, lastVerifiedAt: new Date().toISOString() });
}

/**
 * 조회는 됐는데 권한 변화가 없을 때 — 확인 시각만 갱신한다.
 * (오프라인이라 조회에 실패했으면 **부르지 말 것.** 캐시를 그대로 둬야 유예가 동작한다)
 */
export function markVerified(): void {
  save({ ...cache, lastVerifiedAt: new Date().toISOString() });
}

/** 구독 없이 열 수 있는 레벨인지 */
export function isLevelFree(level: string): boolean {
  return FREE_LEVELS.includes(level);
}

/** 지금 이 레벨을 열 수 있는지 (무료이거나 구독 중) */
export function canOpenLevel(level: string): boolean {
  return isLevelFree(level) || isSubscribed();
}

/** 구독 상태를 구독(subscribe)하는 훅 — 상태가 바뀌면 화면이 다시 그려진다 */
export function useSubscription(): {
  subscribed: boolean;
  inGrace: boolean;
  expiresAt: string | null;
  canOpenLevel: (level: string) => boolean;
} {
  const subscribed = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isSubscribed,
    isSubscribed
  );
  return {
    subscribed,
    inGrace: subscribed && isInGracePeriod(),
    expiresAt: cache.expiresAt,
    canOpenLevel: (level: string) => isLevelFree(level) || subscribed,
  };
}

// ---------------------------------------------------------------------------
// 임시 — 결제 연동 전 화면 확인용
// ---------------------------------------------------------------------------

/**
 * 결제 없이 한 주치 권한을 켜고 끈다. **`react-native-iap` 를 붙이면 지워야 한다.**
 * 실제로는 구매·복원 결과가 `applyEntitlement()` / `clearEntitlement()` 를 부른다.
 */
export function devToggleSubscription(): void {
  if (isSubscribed()) {
    clearEntitlement();
    return;
  }
  applyEntitlement(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
}
