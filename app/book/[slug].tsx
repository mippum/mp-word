import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';

import PlaybackControls from '@/components/PlaybackControls';
import { Text, useThemeColor } from '@/components/Themed';
import WordSpread from '@/components/WordSpread';
import { getBook, iconsForBook, type BookWord } from '@/lib/books';
import {
  jumpWord,
  pause,
  playWord,
  resume,
  stopPlayback,
  subscribeError,
  usePlayer,
} from '@/lib/player';
import { resumeIndex, setProgress } from '@/lib/progress';
import { supportsPause } from '@/lib/tts';

/**
 * 책 보기 + 듣기.
 * 지면을 좌우로 넘기면서 읽고, 재생하면 낭독을 따라 지면과 하이라이트가 움직인다.
 */
export default function BookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const book = useMemo(() => (slug ? getBook(slug) : undefined), [slug]);
  const icons = useMemo(() => (slug ? iconsForBook(slug) : {}), [slug]);
  const { width } = useWindowDimensions();

  const player = usePlayer();
  const isCurrent = player.slug === book?.slug;

  const listRef = useRef<FlatList<BookWord>>(null);
  // 저장된 위치에서 시작 (첫 렌더에서 한 번만 읽는다)
  const [page, setPage] = useState(() => (book ? resumeIndex(book.slug, book.words.length) : 0));
  const [error, setError] = useState<string | null>(null);
  // 낭독이 넘긴 페이지인지, 손으로 넘긴 페이지인지 구분한다
  const scrollingTo = useRef<number | null>(null);

  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');

  useEffect(() => subscribeError(setError), []);

  // 화면을 벗어나면 재생을 멈춘다
  useEffect(() => () => void stopPlayback(), []);

  // 낭독이 다음 단어로 넘어가면 지면도 따라 넘긴다
  useEffect(() => {
    if (!isCurrent || player.wordIndex < 0 || player.wordIndex === page) return;
    scrollingTo.current = player.wordIndex;
    setPage(player.wordIndex);
    listRef.current?.scrollToIndex({ index: player.wordIndex, animated: true });
  }, [isCurrent, player.wordIndex, page]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index;
    if (first == null) return;
    if (scrollingTo.current === first) {
      scrollingTo.current = null;
      return;
    }
    setPage(first);
  }).current;

  /** 재생 중이면 낭독 위치를 옮기고, 아니면 지면만 넘긴다 */
  const step = useCallback(
    (delta: number) => {
      if (!book) return;
      if (isCurrent && player.status === 'playing') {
        jumpWord(book, delta);
        return;
      }
      const next = Math.max(0, Math.min(page + delta, book.words.length - 1));
      if (next === page) return;
      scrollingTo.current = next;
      setPage(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [book, isCurrent, page, player.status]
  );

  const onToggle = useCallback(() => {
    if (!book) return;
    if (isCurrent && player.status === 'playing') {
      void pause();
      return;
    }
    if (isCurrent && player.status === 'paused' && supportsPause) {
      resume(book);
      return;
    }
    playWord(book, page);
  }, [book, isCurrent, page, player.status]);

  // 손으로 넘긴 페이지도 이어보기 위치로 남긴다
  useEffect(() => {
    if (!book || isCurrent) return;
    setProgress(book.slug, page, book.words.length);
  }, [book, isCurrent, page]);

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <Text>책을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <Stack.Screen options={{ title: book.name }} />

      <FlatList
        ref={listRef}
        data={book.words}
        keyExtractor={(word) => word.wordId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={page}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item, index }) => (
          <View style={[styles.page, { width }]}>
            <WordSpread
              word={item}
              iconXml={icons[item.wordId]}
              activeSlot={isCurrent && player.wordIndex === index ? player.slot : null}
            />
          </View>
        )}
      />

      {error ? (
        <Text style={[styles.error, { color: muted }]} onPress={() => setError(null)}>
          {error}
        </Text>
      ) : null}

      <PlaybackControls
        status={isCurrent ? player.status : 'idle'}
        canPause={supportsPause}
        position={page + 1}
        total={book.words.length}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToggle={onToggle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  error: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 6,
  },
});
