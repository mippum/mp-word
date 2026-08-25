import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';

import PlaybackControls from '@/components/PlaybackControls';
import { Text, useThemeColor } from '@/components/Themed';
import WordSpread from '@/components/WordSpread';
import { displayName, getBook, iconsForBook, type BookWord } from '@/lib/books';
import {
  pause,
  playWord,
  resume,
  stopPlayback,
  subscribeError,
  usePlayer,
} from '@/lib/player';
import { resumeIndex, setProgress } from '@/lib/progress';
import { useSubscription } from '@/lib/subscription';
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
  const { canOpenBook } = useSubscription();

  const listRef = useRef<FlatList<BookWord>>(null);
  // 저장된 위치에서 시작한다 (첫 렌더에서 한 번만 읽는다)
  const [wordIndex, setWordIndex] = useState(() =>
    book ? resumeIndex(book.slug, book.words.length) : 0
  );
  const [error, setError] = useState<string | null>(null);
  /**
   * 리스트의 세로 크기. 가로 FlatList 에서는 `flex: 1` 이 **너비**를 정하므로
   * 지면 높이는 이렇게 재서 직접 줘야 한다. 안 그러면 지면이 내용 높이만큼 늘어나
   * 안쪽 ScrollView 가 뷰포트를 못 잡고 내용이 잘린다.
   */
  const [pageHeight, setPageHeight] = useState(0);
  // 낭독이 넘긴 쪽인지, 손으로 넘긴 쪽인지 구분한다
  const scrollingTo = useRef<number | null>(null);

  // 지면은 종이색(paper) — 앱 크롬의 민트를 섞지 않는다 (constants/Colors.ts 참고)
  const background = useThemeColor('paper');
  const muted = useThemeColor('muted');

  useEffect(() => subscribeError(setError), []);

  // 화면을 벗어나면 재생을 멈춘다
  useEffect(() => () => void stopPlayback(), []);

  const goTo = useCallback((index: number) => {
    scrollingTo.current = index;
    setWordIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  // 낭독이 다음 단어로 넘어가면 지면도 따라 넘긴다.
  // **재생 중일 때만** 따라간다 — 멈춘 동안에는 손으로 넘긴 쪽을 그대로 둬야 한다
  // (안 그러면 ◀◀ ▶▶ 로 넘기자마자 멈춰 있던 자리로 되돌아간다)
  useEffect(() => {
    if (!isCurrent || player.status !== 'playing') return;
    if (player.wordIndex < 0 || player.wordIndex === wordIndex) return;
    goTo(player.wordIndex);
  }, [isCurrent, player.status, player.wordIndex, wordIndex, goTo]);

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
    // 멈춘 자리 그대로면 이어서, 그 사이에 다른 쪽으로 넘겼으면 보이는 쪽부터 읽는다
    if (
      isCurrent &&
      player.status === 'paused' &&
      supportsPause &&
      player.wordIndex === wordIndex
    ) {
      resume(book);
      return;
    }
    playWord(book, wordIndex);
  }, [book, isCurrent, player.status, player.wordIndex, wordIndex]);

  // 손으로 넘긴 위치도 이어보기로 남긴다 (단어 단위).
  // 재생 중에는 player 가 기록하므로 건드리지 않는다
  useEffect(() => {
    if (!book) return;
    if (isCurrent && player.status === 'playing') return;
    setProgress(book.slug, wordIndex, book.words.length);
  }, [book, isCurrent, player.status, wordIndex]);

  if (!book) {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <Text>책을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  // 목록에서 막아 두었지만 딥링크로도 들어올 수 있으므로 여기서 한 번 더 막는다
  if (!canOpenBook(book)) {
    return <Redirect href={{ pathname: '/subscribe', params: { level: book.level } }} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <Stack.Screen options={{ title: displayName(book) }} />

      <FlatList
        ref={listRef}
        // 세로 공간을 다 차지해야 지면 안쪽 ScrollView 가 뷰포트를 잡는다
        style={styles.pager}
        onLayout={(e: LayoutChangeEvent) => setPageHeight(e.nativeEvent.layout.height)}
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
          <View style={[styles.page, { width }, pageHeight > 0 && { height: pageHeight }]}>
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
  pager: {
    flex: 1,
  },
  page: {
    // 높이는 onLayout 으로 잰 값을 직접 준다 (위 pageHeight 주석 참고)
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
