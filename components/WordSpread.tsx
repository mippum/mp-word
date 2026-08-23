import { StyleSheet, View } from 'react-native';

import WordIcon from '@/components/WordIcon';
import { Text, useThemeColor } from '@/components/Themed';
import type { BookWord } from '@/lib/books';
import { ordinalWord } from '@/lib/ordinal';
import type { Slot } from '@/lib/script';

/**
 * 단어 한 개의 지면 — 종이책의 펼침면과 같은 순서로 배치한다.
 * 낭독 중인 슬롯에 하이라이트가 붙는다 (activeSlot).
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
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const highlight = useThemeColor({}, 'highlight');

  const mark = (slot: Slot) => (activeSlot === slot ? { backgroundColor: highlight } : null);

  return (
    <View style={[styles.page, { backgroundColor: card, borderColor: border }]}>
      <Text style={[styles.ordinal, { color: muted }]}>{ordinalWord(word.order)} Sentence.</Text>

      <View style={[styles.block, mark('sentence')]}>
        <Text style={styles.sentence}>{word.sentence}</Text>
      </View>

      <View style={styles.keywordRow}>
        <WordIcon xml={iconXml} size={104} color={text} />
        <View style={styles.keywordText}>
          <Text style={[styles.keywordLabel, { color: muted }]}>Keyword</Text>
          <View style={mark('keyword')}>
            <Text style={styles.word}>{word.word}</Text>
            <Text style={[styles.spelling, { color: muted }]}>{word.spelling}</Text>
          </View>
          {word.pronunciationUs ? (
            <Text style={[styles.pron, { color: muted }]}>
              US /{word.pronunciationUs}/{word.pronunciationGb ? `  ·  GB /${word.pronunciationGb}/` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.block, mark('meaningEn')]}>
        <Text style={[styles.label, { color: muted }]}>영영사전 뜻</Text>
        <Text style={styles.body}>{word.meaningEn}</Text>
      </View>

      <View style={[styles.block, mark('meaningKo')]}>
        <Text style={styles.meaningKo}>{word.meaningKo}</Text>
      </View>

      <View
        style={[
          styles.block,
          styles.reading,
          { borderColor: border },
          mark('reading') ?? mark('sentenceEn') ?? mark('sentenceKo'),
        ]}>
        <Text style={styles.sentenceSmall}>{word.sentence}</Text>
        <Text style={[styles.translation, { color: muted }]}>{word.sentenceKo}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 20,
    gap: 18,
  },
  ordinal: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  block: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  sentence: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '600',
  },
  keywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  keywordText: {
    flex: 1,
    gap: 4,
  },
  keywordLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  word: {
    fontSize: 32,
    fontWeight: '700',
  },
  spelling: {
    fontSize: 15,
    letterSpacing: 1,
  },
  pron: {
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
  },
  meaningKo: {
    fontSize: 20,
    fontWeight: '600',
  },
  reading: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  sentenceSmall: {
    fontSize: 17,
    lineHeight: 26,
  },
  translation: {
    fontSize: 16,
    lineHeight: 25,
  },
});
