import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';

import PlaybackControls from '@/components/PlaybackControls';
import { Text, useThemeColor } from '@/components/Themed';
import WordSpread from '@/components/WordSpread';
import { getBook, iconsForBook, type BookWord } from '@/lib/books';
import {
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
 *
 * 종이책은 한 단어를 두 쪽에 싣지만 앱은 **한 단어가 한 쪽**이다 (WordSpread 안에서 세로 스크롤).
 * 낭독이 다음 단어로 넘어가면 지면도 따라 넘어가고, 읽고 있는 자리에 하이라이트가 붙는다.
 * 손으로 좌우로 넘길 수도 있다.
 */

export default function BookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const book = useMemo(() => (slug ? getBook(slug) : undefined), [slug]);
  const icons = useMemo(() => (slug ? iconsForBook(slug) : {}), [slug]);
  const { width } = useWindowDimensions();

  const player = usePlayer();
  const isCurrent = player.slug === book?.slug;

  const listRef = useRef<FlatList<BookWord>>(null);
  // 저장된 위치에서 시작한다 (첫 렌더에서 한 번만 읽는다)
  const [wordIndex, setWordIndex] = useState(() =>
    book ? resumeIndex(book.slug, book.words.length) : 0
  );
  const [error, setError] = useState<string | null>(null);
  // 낭독이 넘긴 쪽인지, 손으로 넘긴 쪽인지 구분한다
  const scrollingTo = useRef<number | null>(null);

  const background = useThemeColor('background');
  const muted = useThemeColor('muted');

  useEffect(() => subscribeError(setError), []);

  // 화면을 벗어나면 재생을 멈춘다
  useEffect(() => () => void stopPlayback(), []);

  const goTo = useCallback((index: number) => {
    scrollingTo.current = index;
    setWordIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  // 낭독이 다음 단어로 넘어가면 지면도 따라 넘긴다
  useEffect(() => {
    if (!isCurrent || player.wordIndex < 0 || player.wordIndex === wordIndex) return;
    goTo(player.wordIndex);
  }, [isCurrent, player.wordIndex, wordIndex, goTo]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index;
    if (first == null) return;
    if (scrollingTo.current === first) {
      scrollingTo.current = null;
      return;
    }
    setWordIndex(first);
  }).current;

  /** 재생 중이면 낭독 위치를 옮기고, 아니면 지면만 넘긴다 */
  const step = useCallback(
    (delta: number) => {
      if (!book) return;
      const next = Math.max(0, Math.min(wordIndex + delta, book.words.length - 1));
      if (isCurrent && player.status === 'playing') {
        playWord(book, next);
        return;
      }
      if (next !== wordIndex) goTo(next);
    },
    [book, isCurrent, player.status, wordIndex, goTo]
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
    playWord(book, wordIndex);
  }, [book, isCurrent, player.status, wordIndex]);

  // 손으로 넘긴 위치도 이어보기로 남긴다 (단어 단위)
  useEffect(() => {
    if (!book || isCurrent) return;
    setProgress(book.slug, wordIndex, book.words.length);
  }, [book, isCurrent, wordIndex]);

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
        keyExtractor={(item) => item.wordId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={wordIndex}
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
        position={wordIndex + 1}
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
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },
  error: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 6,
  },
});
