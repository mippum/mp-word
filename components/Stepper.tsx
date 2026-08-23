import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';

/**
 * −/+ 로 값을 조절하는 작은 컨트롤.
 * 슬라이더 대신 쓰는 이유: 값이 백분율이라 정확히 맞추는 편이 낫고,
 * 추가 네이티브 의존성(@react-native-community/slider)이 필요 없다.
 */
export default function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
}) {
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');

  const atMin = value <= min;
  const atMax = value >= max;
  const change = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => change(-step)}
        disabled={atMin}
        accessibilityLabel={`${label} 줄이기`}
        style={({ pressed }) => [
          styles.button,
          { borderColor: border, backgroundColor: card, opacity: atMin ? 0.35 : pressed ? 0.6 : 1 },
        ]}>
        <Text style={[styles.symbol, { color: text }]}>−</Text>
      </Pressable>

      <Text style={styles.value}>
        {value}
        {unit}
      </Text>

      <Pressable
        onPress={() => change(step)}
        disabled={atMax}
        accessibilityLabel={`${label} 늘리기`}
        style={({ pressed }) => [
          styles.button,
          { borderColor: border, backgroundColor: card, opacity: atMax ? 0.35 : pressed ? 0.6 : 1 },
        ]}>
        <Text style={[styles.symbol, { color: text }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  button: {
    width: 40,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 18,
  },
  value: {
    minWidth: 60,
    textAlign: 'center',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
