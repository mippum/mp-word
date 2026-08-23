import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';

export const COVER_WIDTH = 58;
const COVER_HEIGHT = 78;

/**
 * 책장에 꽂힌 책 한 권.
 * 왼쪽에 책등 선을 그어 세워 둔 책처럼 보이게 하고, 가운데에 권차(`1st`)를 적는다.
 * 권차가 없는 단권(Entry 등)은 책 아이콘을 대신 넣는다.
 *
 * 표지만 늘어놓는 목록이라 상태는 표지 위에 얹는다 —
 * 잠김은 자물쇠, 읽은 분량은 아래쪽 띠로 보여준다 (책에 끼운 갈피처럼).
 */
export default function BookCover({
  volume,
  locked = false,
  progress = 0,
}: {
  /** '1st' 같은 짧은 권차. 없으면 책 아이콘 */
  volume: string | null;
  locked?: boolean;
  /** 읽은 비율 0~1. 0 이면 띠를 그리지 않는다 */
  progress?: number;
}) {
  const text = useThemeColor('text');
  const faint = useThemeColor('faint');
  const border = useThemeColor('border');
  const rule = useThemeColor('rule');
  const card = useThemeColor('card');
  const accent = useThemeColor('accent');

  const ink = locked ? faint : text;

  return (
    <View
      style={[
        styles.cover,
        { borderColor: border, backgroundColor: card },
        locked && styles.locked,
      ]}>
      {/* 책등 */}
      <View style={[styles.spine, { backgroundColor: rule }]} />

      {volume ? (
        <Text style={[styles.volume, { color: ink }]}>{volume}</Text>
      ) : (
        <FontAwesome name="book" size={20} color={ink} />
      )}

      {locked ? <FontAwesome name="lock" size={10} color={faint} style={styles.badge} /> : null}

      {!locked && progress > 0 ? (
        <View style={[styles.track, { backgroundColor: border }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: accent, width: `${Math.min(100, Math.max(4, progress * 100))}%` },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    // 책등 쪽은 각지게, 바깥쪽은 둥글게 — 세워 둔 책처럼 보인다
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: {
    // 글자색이 이미 흐리므로(faint) 투명도까지 세게 주면 권차가 안 읽힌다
    opacity: 0.8,
  },
  spine: {
    position: 'absolute',
    left: 7,
    top: 0,
    bottom: 0,
    width: 1,
  },
  volume: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 6,
  },
  badge: {
    position: 'absolute',
    right: 5,
    bottom: 4,
  },
  track: {
    position: 'absolute',
    left: 8,
    right: 6,
    bottom: 6,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
