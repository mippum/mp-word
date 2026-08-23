import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { booksByLevel, type Book } from '@/lib/books';
import { getProgress } from '@/lib/progress';

/** 책장 — 레벨별로 묶은 권 목록. 누르면 그 책을 펼친다. */
export default function BookshelfScreen() {
  const sections = useMemo(
    () => booksByLevel().map(({ level, books }) => ({ title: level, data: books })),
    []
  );
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');

  return (
    <SectionList
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(book) => book.slug}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={[styles.level, { color: muted, borderColor: border }]}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => <BookRow book={item} />}
    />
  );
}

function BookRow({ book }: { book: Book }) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

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
        {read > 0 ? <View style={[styles.dot, { backgroundColor: tint }]} /> : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 8,
  },
  level: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
