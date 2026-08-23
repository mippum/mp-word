import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { previewVoice } from '@/lib/player';
import type { Utterance } from '@/lib/script';
import { getSettings, setSettings, type AppSettings } from '@/lib/settings';
import { voicesForLanguage, type TtsVoice } from '@/lib/tts';

type Lang = Utterance['lang'];

const SETTING_KEY: Record<Lang, keyof AppSettings> = { ko: 'voiceKo', en: 'voiceEn' };

/**
 * 언어별 목소리 선택. 항목을 누르면 선택과 동시에 그 목소리로 짧은 샘플을 들려준다.
 * `reloadKey` 가 바뀌면 목록을 다시 읽는다 (Android 엔진 변경 시).
 */
export default function VoicePicker({
  lang,
  label,
  autoLabel,
  reloadKey = 0,
  onChange,
}: {
  lang: Lang;
  label: string;
  autoLabel: string;
  reloadKey?: number;
  onChange?: (voiceId: string | null) => void;
}) {
  const [voices, setVoices] = useState<TtsVoice[] | null>(null);
  const [selected, setSelected] = useState<string | null>(() => getSettings()[SETTING_KEY[lang]]);

  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const highlight = useThemeColor({}, 'highlight');

  useEffect(() => {
    let alive = true;
    setVoices(null);
    voicesForLanguage(lang)
      .then((list) => {
        if (!alive) return;
        setVoices(list);
        // 엔진이 바뀌어 고른 목소리가 사라졌으면 자동으로 되돌린다
        const current = getSettings()[SETTING_KEY[lang]];
        if (current && !list.some((v) => v.id === current)) {
          setSettings({ [SETTING_KEY[lang]]: null });
          setSelected(null);
          onChange?.(null);
        }
      })
      .catch(() => {
        if (alive) setVoices([]);
      });
    return () => {
      alive = false;
    };
    // onChange 는 매 렌더 새 함수일 수 있어 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, reloadKey]);

  const choose = (voiceId: string | null) => {
    setSettings({ [SETTING_KEY[lang]]: voiceId });
    setSelected(voiceId);
    onChange?.(voiceId);
    void previewVoice(lang, voiceId);
  };

  const rows: { id: string | null; name: string; note: string }[] = [
    { id: null, name: autoLabel, note: '' },
    ...(voices ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      note: [v.quality !== '기본' ? v.quality : '', v.network ? '인터넷 필요' : '']
        .filter(Boolean)
        .join(' · '),
    })),
  ];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: muted }]}>{label}</Text>
      {voices === null ? (
        <ActivityIndicator style={styles.loading} color={tint} />
      ) : (
        <View style={[styles.list, { borderColor: border }]}>
          {rows.map((row, index) => {
            const active = row.id === selected;
            return (
              <Pressable
                key={row.id ?? '__auto__'}
                onPress={() => choose(row.id)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border },
                  active && { backgroundColor: highlight },
                  pressed && { opacity: 0.6 },
                ]}>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{row.name}</Text>
                  {row.note ? <Text style={[styles.note, { color: muted }]}>{row.note}</Text> : null}
                </View>
                {active ? <Text style={[styles.check, { color: text }]}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loading: {
    paddingVertical: 16,
  },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
  },
  note: {
    fontSize: 12,
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
  },
});
