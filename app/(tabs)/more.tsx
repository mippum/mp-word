import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { booksByLevel, displayName, getBook, listBooks } from '@/lib/books';
import { freeScopeLabel, PLAN, useSubscription } from '@/lib/subscription';

/**
 * 더보기 — 앱 사용법과 수록 구성 안내.
 * 조작할 것은 없고 읽기만 하는 화면이다 (설정은 설정 탭).
 */
export default function MoreScreen() {
  const background = useThemeColor('background');
  const accent = useThemeColor('accent');
  const border = useThemeColor('border');
  const muted = useThemeColor('muted');
  const router = useRouter();
  const { subscribed } = useSubscription();
  const freeScope = freeScopeLabel((slug) => {
    const book = getBook(slug);
    return book ? displayName(book) : slug;
  });

  const books = listBooks();
  const levels = useMemo(() => booksByLevel(), []);
  const wordCount = books.reduce((sum, book) => sum + book.wordCount, 0);

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      <Card title="구독">
        <Row label="상태" value={subscribed ? '구독 중' : '구독 안 함'} />
        <Row label="요금" value={`${PLAN.label} (${PLAN.period}마다 결제)`} />
        <Row label="무료" value={freeScope} />
        <Note>
          {subscribed ? '모든 책을 볼 수 있습니다.' : '그 밖의 책은 구독해야 열립니다.'}
        </Note>
        <Pressable
          onPress={() => router.push('/subscribe')}
          accessibilityRole="button"
          accessibilityLabel={subscribed ? '구독 정보 보기' : '구독 안내 보기'}
          style={({ pressed }) => [
            styles.button,
            { borderColor: subscribed ? border : accent },
            pressed && { opacity: 0.6 },
          ]}>
          <Text style={[styles.buttonText, { color: subscribed ? muted : accent }]}>
            {subscribed ? '구독 정보 보기' : '구독 안내 보기'}
          </Text>
        </Pressable>
      </Card>

      <Card title="사용법">
        <Step n={1} text="읽기 탭에서 권을 고릅니다. 레벨 이름을 누르면 접었다 펼 수 있습니다." />
        <Step n={2} text="지면을 좌우로 넘기며 읽습니다. 한 쪽이 단어 하나입니다." />
        <Step n={3} text="재생을 누르면 낭독이 시작되고, 지금 읽는 부분이 노랗게 표시됩니다." />
        <Step n={4} text="낭독을 따라 지면이 저절로 넘어가고, 화면 밖이면 그 자리로 스크롤합니다." />
        <Step n={5} text="◀◀ ▶▶ 로 앞뒤 단어로 건너뜁니다." />
        <Step n={6} text="나갔다 다시 들어오면 읽던 자리에서 이어집니다." />
      </Card>

      <Card title="지면 보는 법">
        <Row label="순번" value="이 권에서 몇 번째 단어인지" />
        <Row label="예문" value="키워드가 쓰인 문장" />
        <Row label="Keyword" value="단어 · 발음기호 · 그림" />
        <Row label="영영사전 뜻" value="쉬운 영어로 풀어 쓴 설명" />
        <Row label="한글 뜻" value="대표 뜻" />
        <Row label="해석" value="예문의 우리말 뜻" />
      </Card>

      <Card title="낭독 순서">
        <Note>
          단어 하나를 아래 차례로 읽습니다. 종이책·전자책과 같은 순서이며, 지금 읽는 부분이
          노랗게 표시됩니다.
        </Note>
        <Row label="1" value="예문 → 순번 안내 → 예문" />
        <Row label="2" value="Keyword → 단어 → 철자 → 단어" />
        <Row label="3" value="영영사전 뜻 (한 문장씩)" />
        <Row label="4" value="한글 뜻 ↔ 단어" />
        <Row label="5" value="해석 ↔ 예문" />
        <Row label="6" value="예문" />
        <Row label="7" value="해석" />
      </Card>

      <Card title="레벨">
        <Note>쉬운 순서입니다. 권당 69단어가 기본입니다.</Note>
        {levels.map(({ level, books: inLevel }) => (
          <Row
            key={level}
            label={level}
            value={`${inLevel.length}권 · 단어 ${inLevel
              .reduce((s, b) => s + b.wordCount, 0)
              .toLocaleString('ko-KR')}개`}
          />
        ))}
      </Card>

      <Card title="수록">
        <Row label="책" value={`${books.length}권`} />
        <Row label="단어" value={`${wordCount.toLocaleString('ko-KR')}개`} />
        <Note>
          단어마다 미국식·영국식 발음, 영영사전 뜻, 예문과 우리말 해석, 그림을 담았습니다.
        </Note>
      </Card>

      <Card title="앱 정보">
        <Row label="이름" value="미쁨 영단어" />
        <Row label="버전" value={Constants.expoConfig?.version ?? '-'} />
        <Note>목소리와 낭독 설정은 설정 탭에 있습니다.</Note>
      </Card>
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const card = useThemeColor('card');
  const border = useThemeColor('border');
  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  const muted = useThemeColor('muted');
  const border = useThemeColor('border');
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, { borderColor: border }]}>
        <Text style={[styles.stepNumText, { color: muted }]}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const muted = useThemeColor('muted');
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: muted }]}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  const muted = useThemeColor('muted');
  return <Text style={[styles.note, { color: muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
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
    marginBottom: 2,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowLabel: {
    width: 96,
    fontSize: 14,
    lineHeight: 22,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  note: {
    fontSize: 13,
    lineHeight: 21,
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
