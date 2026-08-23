import Constants from 'expo-constants';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { listBooks } from '@/lib/books';
import { supportsPause } from '@/lib/tts';

/**
 * 설정 — 지금은 안내만 한다.
 * 재생 속도·음높이·목소리는 시스템 "글자 읽어주기" 설정을 그대로 따른다
 * (앱 설정과 곱해져 혼란스러워지는 것을 막기 위해 앱에는 두지 않는다).
 */
export default function SettingsScreen() {
  const background = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');

  const books = listBooks();
  const wordCount = books.reduce((sum, book) => sum + book.wordCount, 0);

  const rows: { label: string; value: string }[] = [
    { label: '책', value: `${books.length}권` },
    { label: '단어', value: `${wordCount.toLocaleString('ko-KR')}개` },
    { label: '버전', value: Constants.expoConfig?.version ?? '-' },
  ];

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.title}>낭독</Text>
        <Text style={[styles.body, { color: muted }]}>
          목소리와 빠르기는 기기의 시스템 음성 설정을 따릅니다.
          {Platform.OS === 'android'
            ? ' 설정 → 접근성 → 글자 읽어주기에서 바꿀 수 있습니다.'
            : ' 설정 → 손쉬운 사용 → 콘텐츠 말하기에서 바꿀 수 있습니다.'}
        </Text>
        {!supportsPause ? (
          <Text style={[styles.body, { color: muted }]}>
            이 기기에서는 일시정지를 지원하지 않아, 멈추면 읽던 단어의 처음부터 다시 재생합니다.
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.title}>정보</Text>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={[styles.body, { color: muted }]}>{row.label}</Text>
            <Text style={styles.body}>{row.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
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
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
