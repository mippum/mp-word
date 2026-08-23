import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { displayName, getBook } from '@/lib/books';
import {
  devToggleSubscription,
  freeScopeLabel,
  PLAN,
  useSubscription,
} from '@/lib/subscription';

/**
 * 구독 안내.
 * 잠긴 권을 누르거나 더보기의 구독 카드에서 들어온다.
 *
 * ⚠️ 아직 결제가 붙어 있지 않다 — 아래 버튼은 상태만 바꾸는 임시 토글이다.
 * lib/subscription.ts 의 설명 참고.
 */
export default function SubscribeScreen() {
  const { level } = useLocalSearchParams<{ level?: string }>();
  const router = useRouter();
  const { subscribed, inGrace, expiresAt } = useSubscription();
  const freeScope = freeScopeLabel((slug) => {
    const book = getBook(slug);
    return book ? displayName(book) : slug;
  });

  const background = useThemeColor('background');
  const card = useThemeColor('card');
  const border = useThemeColor('border');
  const muted = useThemeColor('muted');
  const accent = useThemeColor('accent');
  const onAccent = useThemeColor('onAccent');

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '구독' }} />

      <View style={[styles.hero, { backgroundColor: card, borderColor: border }]}>
        <FontAwesome name={subscribed ? 'check-circle' : 'lock'} size={28} color={muted} />
        <Text style={styles.price}>{PLAN.label}</Text>
        <Text style={[styles.period, { color: muted }]}>
          {PLAN.period}마다 {PLAN.priceKrw.toLocaleString('ko-KR')}원
        </Text>
        {subscribed && expiresAt ? (
          <Text style={[styles.note, { color: muted }]}>
            {inGrace
              ? '갱신을 확인하지 못했습니다. 잠시 열어 두고 있습니다.'
              : `${new Date(expiresAt).toLocaleDateString('ko-KR')}까지`}
          </Text>
        ) : level ? (
          <Text style={[styles.note, { color: muted }]}>
            {level} 단계는 구독하면 열립니다.
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.title}>구독하면</Text>
        <Bullet text="모든 레벨의 책을 볼 수 있습니다." />
        <Bullet text="낭독도 그대로 들을 수 있습니다." />
        <Bullet text="새로 나오는 권도 추가 결제 없이 열립니다." />
      </View>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.title}>구독 없이도</Text>
        <Bullet text={`${freeScope}는 그대로 볼 수 있습니다.`} />
      </View>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.title, { color: muted }]}>준비 중</Text>
        <Text style={[styles.note, { color: muted }]}>
          결제 연동은 아직 붙어 있지 않습니다. 아래 버튼은 화면을 확인하기 위한 임시 전환이며,
          실제 과금은 스토어에 구독 상품을 등록하고 결제를 연결한 뒤 동작합니다.
        </Text>
        <Pressable
          onPress={() => {
            devToggleSubscription();
            if (!subscribed) router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel={subscribed ? '구독 해지 (임시)' : '구독 중으로 전환 (임시)'}
          style={({ pressed }) => [
            styles.button,
            subscribed
              ? { borderColor: border }
              : { backgroundColor: accent, borderColor: accent },
            pressed && { opacity: 0.7 },
          ]}>
          <Text style={[styles.buttonText, { color: subscribed ? muted : onAccent }]}>
            {subscribed ? '구독 해지 (임시)' : '구독 중으로 전환 (임시)'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Bullet({ text }: { text: string }) {
  const muted = useThemeColor('muted');
  return (
    <View style={styles.bullet}>
      <Text style={[styles.dot, { color: muted }]}>·</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  hero: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  period: {
    fontSize: 14,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  bullet: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  note: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
