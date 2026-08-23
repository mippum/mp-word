import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import BookCover from '@/components/BookCover';
import { Text, useThemeColor } from '@/components/Themed';
import { booksByLevel, displayName, volumeLabel, type Book } from '@/lib/books';
import { getProgress } from '@/lib/progress';
import { getSettings, setSettings } from '@/lib/settings';
import { isFreeSample, useSubscription } from '@/lib/subscription';

/**
 * 읽기 탭 — 레벨별 책장. 표지를 누르면 그 책을 펼친다.
 *
 * 44권이 한 번에 늘어서면 훑기 어려워서 레벨 머리글로 접었다 펼 수 있게 했다.
 * 접은 레벨은 설정(`collapsedLevels`)에 남아 다시 들어와도 유지된다.
 *
 * 목록이 아니라 표지를 늘어놓는 형태라 상태(잠김·읽던 위치)는 표지 위에 얹는다.
 * 44권뿐이라 가상화 없이 통째로 그린다.
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

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      {levels.map(({ level, series, books }) => {
        const isCollapsed = collapsed.includes(level);
        return (
          <View key={level}>
            <LevelHeader
              title={series ? `${series} ${level}` : level}
              count={books.length}
              collapsed={isCollapsed}
              // 낱권 무료가 하나라도 있으면 레벨 자물쇠를 달지 않는다
              locked={books.every((book) => !canOpenBook(book))}
              onPress={() => toggle(level)}
            />
            {isCollapsed ? null : (
              <View style={styles.shelf}>
                {books.map((book) => (
                  <BookTile
                    key={book.slug}
                    book={book}
                    locked={!canOpenBook(book)}
                    freeSample={!subscribed && isFreeSample(book)}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function LevelHeader({
  title,
  count,
  collapsed,
  locked,
  onPress,
}: {
  /** 화면에 보이는 이름 ('Foundation Entry') */
  title: string;
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
      accessibilityLabel={`${title} ${count}권 ${collapsed ? '펼치기' : '접기'}`}
      style={({ pressed }) => [styles.header, { borderColor: border }, pressed && { opacity: 0.6 }]}>
      <FontAwesome
        name={collapsed ? 'chevron-right' : 'chevron-down'}
        size={11}
        color={muted}
        style={styles.chevron}
      />
      <Text style={[styles.level, { color: muted }]}>{title}</Text>
      {locked ? (
        <FontAwesome name="lock" size={11} color={muted} style={styles.levelLock} />
      ) : null}
      <Text style={[styles.count, { color: muted }]}>{count}권</Text>
    </Pressable>
  );
}

function BookTile({
  book,
  locked,
  freeSample,
}: {
  book: Book;
  locked: boolean;
  freeSample: boolean;
}) {
  const router = useRouter();
  const muted = useThemeColor('muted');

  const saved = getProgress(book.slug);
  const read = saved && saved.wordIndex > 0 ? saved.wordIndex : 0;
  // 읽은 비율 — 완독하면 위치가 0 으로 되돌아가므로 여기서는 항상 진행 중인 값이다
  const ratio = book.wordCount > 0 ? read / book.wordCount : 0;
  const percent = ratio > 0 ? Math.max(1, Math.round(ratio * 100)) : 0;

  // 잠긴 권도 책장에 남겨 두되(무엇이 있는지 보이도록) 누르면 구독 안내로 보낸다
  const open = () =>
    locked
      ? router.push({ pathname: '/subscribe', params: { level: book.level } })
      : router.push({ pathname: '/book/[slug]', params: { slug: book.slug } });

  // 표지에는 권차만 보이므로 나머지 정보는 접근성 라벨이 실어 나른다
  const state = locked
    ? '잠김, 구독 안내 열기'
    : read > 0
      ? `${book.wordCount}개 중 ${read}개 읽음, ${percent} 퍼센트`
      : freeSample
        ? '무료 공개'
        : '';

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${displayName(book)} 단어 ${book.wordCount}개${state ? `, ${state}` : ''}`}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.6 }]}>
      <BookCover volume={volumeLabel(book)} locked={locked} progress={ratio} />
      {percent > 0 ? (
        <Text style={[styles.caption, { color: muted }]}>{percent}%</Text>
      ) : freeSample ? (
        <Text style={[styles.caption, { color: muted }]}>무료</Text>
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
    marginBottom: 12,
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
  shelf: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  tile: {
    alignItems: 'center',
    gap: 3,
  },
  caption: {
    fontSize: 11,
  },
});
