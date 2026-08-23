import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import WordIcon from '@/components/WordIcon';
import type { BookWord } from '@/lib/books';
import { ordinalWord } from '@/lib/ordinal';
import type { Slot } from '@/lib/script';

/**
 * 단어 한 개의 지면.
 *
 * 출판된 전자책(`mp-word-en-beginner/yes24`)은 한 단어를 두 쪽에 나눠 싣지만,
 * 앱은 **한 단어를 한 쪽**에 담고 세로로 스크롤한다 (종이와 달리 길이 제약이 없다).
 * 요소 순서는 책과 같다:
 *
 *   순번 라벨 · 예문 · 키워드 카드(단어+발음+아이콘)
 *   ─ 영영사전 뜻 ─ 한글 뜻 ─ 해석 + 예문
 *
 * 낭독 중인 슬롯에 하이라이트가 붙고, 화면 밖이면 그 자리로 스크롤한다.
 */
export default function WordSpread({
  word,
  iconXml,
  activeSlot,
}: {
  word: BookWord;
  iconXml?: string;
  activeSlot: Slot | null;
}) {
  const text = useThemeColor('text');
  const muted = useThemeColor('muted');
  const faint = useThemeColor('faint');
  const rule = useThemeColor('rule');
  const highlight = useThemeColor('highlight');

  const scrollRef = useRef<ScrollView>(null);
  /** 슬롯별 y 좌표 — 낭독이 화면 밖으로 내려가면 여기로 스크롤한다 */
  const offsets = useRef<Partial<Record<Slot, number>>>({});

  const measure = useCallback(
    (slot: Slot) => (e: LayoutChangeEvent) => {
      offsets.current[slot] = e.nativeEvent.layout.y;
    },
    []
  );

  useEffect(() => {
    if (!activeSlot) return;
    const y = offsets.current[activeSlot];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
  }, [activeSlot]);

  const mark = (slot: Slot) => (activeSlot === slot ? { backgroundColor: highlight } : null);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.ordinalRow}>
        <View style={[styles.ordinalRule, { backgroundColor: rule }]} />
        <Text style={[styles.ordinalLabel, { color: muted }]}>
          {ordinalWord(word.order)} Sentence
        </Text>
      </View>

      <View onLayout={measure('sentence')} style={styles.sentenceArea}>
        <View style={[styles.sentenceBox, mark('sentence')]}>
          <Text style={styles.sentence}>{word.sentence}</Text>
        </View>
      </View>

      <View
        onLayout={measure('keyword')}
        style={[styles.keywordCard, { borderColor: rule }, mark('keyword')]}>
        <View style={styles.keywordText}>
          <Text style={[styles.keywordLabel, { color: muted }]}>Keyword</Text>
          <Text style={styles.keyword}>{word.word}</Text>
          {word.pronunciationUs || word.pronunciationGb ? (
            <Text style={[styles.pron, { color: muted }]}>
              {word.pronunciationUs ? `US [${word.pronunciationUs}]` : ''}
              {word.pronunciationUs && word.pronunciationGb ? '\n' : ''}
              {word.pronunciationGb ? `UK [${word.pronunciationGb}]` : ''}
            </Text>
          ) : null}
        </View>
        <WordIcon xml={iconXml} size={88} color={text} />
      </View>

      <View style={[styles.divider, { backgroundColor: rule }]} />

      <View onLayout={measure('meaningEn')}>
        <Text style={[styles.caption, { color: faint }]}>(영영사전 뜻)</Text>
        <View style={mark('meaningEn')}>
          <Text style={styles.definition}>
            {'   '}
            {word.meaningEn}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: rule }]} />

      <View onLayout={measure('meaningKo')} style={mark('meaningKo')}>
        <Text style={styles.meaningKo}>{word.meaningKo}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: rule }]} />

      <View onLayout={measure('reading')}>
        <View style={mark('reading') ?? mark('sentenceKo')}>
          <Text style={[styles.translation, { color: muted }]}>{word.sentenceKo}</Text>
        </View>
        <View style={mark('sentenceEn')}>
          <Text style={styles.sentenceSmall}>{word.sentence}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  ordinalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  ordinalRule: {
    width: 52,
    height: 2,
  },
  ordinalLabel: {
    fontSize: 13,
  },
  sentenceArea: {
    marginTop: 34,
    alignItems: 'center',
  },
  sentenceBox: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sentence: {
    fontSize: 25,
    lineHeight: 35,
    fontWeight: '700',
    textAlign: 'center',
  },
  keywordCard: {
    marginTop: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderWidth: 2,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  keywordText: {
    flexShrink: 1,
    gap: 4,
  },
  keywordLabel: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  keyword: {
    fontSize: 27,
    fontWeight: '700',
  },
  pron: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  caption: {
    fontSize: 13,
    marginBottom: 8,
  },
  definition: {
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'justify',
  },
  meaningKo: {
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  translation: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  sentenceSmall: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
});
