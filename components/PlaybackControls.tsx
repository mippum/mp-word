import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import type { PlaybackStatus } from '@/lib/player';

/**
 * 재생 컨트롤 — 이전 단어 / 재생·일시정지 / 다음 단어.
 * Android 는 일시정지를 지원하지 않아 정지 아이콘을 보여준다.
 */
export default function PlaybackControls({
  status,
  canPause,
  position,
  total,
  onPrev,
  onNext,
  onToggle,
}: {
  status: PlaybackStatus;
  canPause: boolean;
  /** 1-based 표시용 */
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
}) {
  const accent = useThemeColor('accent');
  const text = useThemeColor('text');
  const muted = useThemeColor('muted');
  const chrome = useThemeColor('chrome');
  const border = useThemeColor('border');

  const playing = status === 'playing';
  const icon = playing ? (canPause ? 'pause' : 'stop') : 'play';

  return (
    <View style={[styles.bar, { backgroundColor: chrome, borderColor: border }]}>
      <Pressable
        onPress={onPrev}
        disabled={position <= 1}
        accessibilityRole="button"
        accessibilityLabel="이전 단어"
        hitSlop={12}
        style={({ pressed }) => [styles.side, { opacity: position <= 1 ? 0.3 : pressed ? 0.5 : 1 }]}>
        <FontAwesome name="step-backward" size={22} color={text} />
      </Pressable>

      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? (canPause ? '일시정지' : '정지') : '재생'}
        hitSlop={12}
        style={({ pressed }) => [styles.main, { backgroundColor: accent, opacity: pressed ? 0.7 : 1 }]}>
        <FontAwesome name={icon} size={22} color="#fff" />
      </Pressable>

      <Pressable
        onPress={onNext}
        disabled={position >= total}
        accessibilityRole="button"
        accessibilityLabel="다음 단어"
        hitSlop={12}
        style={({ pressed }) => [
          styles.side,
          { opacity: position >= total ? 0.3 : pressed ? 0.5 : 1 },
        ]}>
        <FontAwesome name="step-forward" size={22} color={text} />
      </Pressable>

      <Text style={[styles.counter, { color: muted }]}>
        {position} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  side: {
    padding: 8,
  },
  main: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    right: 20,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
