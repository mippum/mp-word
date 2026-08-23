import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { booksByLevel, type Book } from '@/lib/books';
import { getProgress } from '@/lib/progress';
import { getSettings, setSettings } from '@/lib/settings';
import { isFreeSample, useSubscription } from '@/lib/subscription';

/**
 * 읽기 탭 — 레벨별로 묶은 권 목록. 누르면 그 책을 펼친다.
 *
 * 44권이 한 번에 늘어서면 훑기 어려워서 레벨 머리글로 접었다 펼 수 있게 했다.
 * 접은 레벨은 설정(`collapsedLevels`)에 남아 다시 들어와도 유지된다.
 */
export default function BookListScreen() {
  const levels = useMemo(() => booksByLevel(), []);
  const [collapsed, setCollapsed] = useState<string[]>(() => getSettings().collapsedLevels);
  const { subscribed, canOpenBook } = useSubscription();

  const background = useThemeColor('background');

  const toggle = useCallback((level: string) => {
    setCollapsed((current) => {
      const next = current.includes(level)
        ? current.filter((name) => name !== level)
        : [...current, level];
      setSettings({ collapsedLevels: next });
      return next;
    });
  }, []);

  const sections = useMemo(
    () =>
      levels.map(({ level, books }) => ({
        title: level,
        count: books.length,
        // 낱권 무료가 하나라도 있으면 레벨 자물쇠를 달지 않는다
        locked: books.every((book) => !canOpenBook(book)),
        // 접힌 레벨은 항목을 비워 머리글만 남긴다
        data: collapsed.includes(level) ? [] : books,
      })),
    [levels, collapsed, canOpenBook]
  );

  return (
    <SectionList
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(book) => book.slug}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <LevelHeader
          level={section.title}
          count={section.count}
          collapsed={collapsed.includes(section.title)}
          locked={section.locked}
          onPress={() => toggle(section.title)}
        />
      )}
      renderItem={({ item }) => (
        // '무료 공개' 표시는 구독 전에만 의미가 있다 (구독 중에는 이어보기를 보여준다)
        <BookRow
          book={item}
          locked={!canOpenBook(item)}
          freeSample={!subscribed && isFreeSample(item)}
        />
      )}
    />
  );
}

function LevelHeader({
  level,
  count,
  collapsed,
  locked,
  onPress,
}: {
  level: string;
  count: number;
  collapsed: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const muted = useThemeColor('muted');
  const border = useThemeColor('border');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      accessibilityLabel={`${level} ${count}권 ${collapsed ? '펼치기' : '접기'}`}
      style={({ pressed }) => [styles.header, { borderColor: border }, pressed && { opacity: 0.6 }]}>
      <FontAwesome
        name={collapsed ? 'chevron-right' : 'chevron-down'}
        size={11}
        color={muted}
        style={styles.chevron}
      />
      <Text style={[styles.level, { color: muted }]}>{level}</Text>
      {locked ? (
        <FontAwesome name="lock" size={11} color={muted} style={styles.levelLock} />
      ) : null}
      <Text style={[styles.count, { color: muted }]}>{count}권</Text>
    </Pressable>
  );
}

function BookRow({
  book,
  locked,
  freeSample,
}: {
  book: Book;
  locked: boolean;
  freeSample: boolean;
}) {
  const router = useRouter();
  const card = useThemeColor('card');
  const border = useThemeColor('border');
  const muted = useThemeColor('muted');
  const faint = useThemeColor('faint');
  const accent = useThemeColor('accent');

  const progress = getProgress(book.slug);
  const read = progress && progress.wordIndex > 0 ? progress.wordIndex : 0;

  // 잠긴 권은 목록에 남겨 두되(무엇이 있는지 보이도록) 누르면 구독 안내로 보낸다
  const open = () =>
    locked
      ? router.push({ pathname: '/subscribe', params: { level: book.level } })
      : router.push({ pathname: '/book/[slug]', params: { slug: book.slug } });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${book.name} 잠김, 구독 안내 열기` : book.name}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: card, borderColor: border, opacity: pressed ? 0.6 : 1 },
      ]}>
      <View style={styles.rowText}>
        <Text style={[styles.bookName, locked && { color: faint }]}>{book.name}</Text>
        <Text style={[styles.meta, { color: locked ? faint : muted }]}>
          단어 {book.wordCount}개
          {locked
            ? ' · 구독 필요'
            : freeSample
              ? ' · 무료 공개'
              : read > 0
                ? ` · ${read + 1}번째부터 이어보기`
                : ''}
        </Text>
      </View>
      {locked ? (
        <FontAwesome name="lock" size={14} color={faint} />
      ) : read > 0 ? (
        <View style={[styles.dot, { backgroundColor: accent }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chevron: {
    width: 18,
  },
  level: {
    flex: 1,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  levelLock: {
    marginRight: 8,
  },
  count: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  bookName: {
    fontSize: 17,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
