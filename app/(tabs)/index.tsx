import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { booksByLevel, type Book } from '@/lib/books';
import { getProgress } from '@/lib/progress';
import { getSettings, setSettings } from '@/lib/settings';

/**
 * 책장 — 레벨별로 묶은 권 목록. 누르면 그 책을 펼친다.
 *
 * 44권이 한 번에 늘어서면 훑기 어려워서 레벨 머리글로 접었다 펼 수 있게 했다.
 * 접은 레벨은 설정(`collapsedLevels`)에 남아 다시 들어와도 유지된다.
 */
export default function BookshelfScreen() {
  const levels = useMemo(() => booksByLevel(), []);
  const [collapsed, setCollapsed] = useState<string[]>(() => getSettings().collapsedLevels);

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
        // 접힌 레벨은 항목을 비워 머리글만 남긴다
        data: collapsed.includes(level) ? [] : books,
      })),
    [levels, collapsed]
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
          onPress={() => toggle(section.title)}
        />
      )}
      renderItem={({ item }) => <BookRow book={item} />}
    />
  );
}

function LevelHeader({
  level,
  count,
  collapsed,
  onPress,
}: {
  level: string;
  count: number;
  collapsed: boolean;
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
      <Text style={[styles.count, { color: muted }]}>{count}권</Text>
    </Pressable>
  );
}

function BookRow({ book }: { book: Book }) {
  const card = useThemeColor('card');
  const border = useThemeColor('border');
  const muted = useThemeColor('muted');
  const accent = useThemeColor('accent');

  const progress = getProgress(book.slug);
  const read = progress && progress.wordIndex > 0 ? progress.wordIndex : 0;

  return (
    <Link href={{ pathname: '/book/[slug]', params: { slug: book.slug } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: card, borderColor: border, opacity: pressed ? 0.6 : 1 },
        ]}>
        <View style={styles.rowText}>
          <Text style={styles.bookName}>{book.name}</Text>
          <Text style={[styles.meta, { color: muted }]}>
            단어 {book.wordCount}개
            {read > 0 ? ` · ${read + 1}번째부터 이어보기` : ''}
          </Text>
        </View>
        {read > 0 ? <View style={[styles.dot, { backgroundColor: accent }]} /> : null}
      </Pressable>
    </Link>
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
