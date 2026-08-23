import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import VoicePicker from '@/components/VoicePicker';
import { listBooks } from '@/lib/books';
import {
  engineKind,
  openSystemTtsSettings,
  supportsEngineSelection,
  supportsPause,
  supportsVoiceSelection,
  syncSystemEngine,
} from '@/lib/tts';

/**
 * 설정 — 언어별 목소리 선택 + 시스템 TTS 안내 + 앱 정보.
 *
 * 재생 속도·음높이는 두지 않는다. 시스템 설정이 유일한 진실의 원천이고,
 * 앱 설정과 곱해지면 사용자가 결과를 예측할 수 없기 때문이다.
 */
export default function SettingsScreen() {
  const background = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  // 엔진이 바뀌면 목소리 목록도 바뀌므로 VoicePicker 를 다시 그리게 하는 카운터
  const [voiceListVersion, setVoiceListVersion] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  /** 시스템 기본 엔진을 앱에 동기화한다 ("글자 읽어주기"에서 바꾸고 돌아온 경우 반영) */
  const syncEngines = useCallback(async () => {
    try {
      const changed = await syncSystemEngine();
      if (changed) {
        // 이전 엔진에서 고른 목소리는 새 엔진에 없으므로 VoicePicker 가 알아서 초기화한다
        setVoiceListVersion((v) => v + 1);
        setNotice('시스템 TTS 엔진 변경이 반영되었습니다 (목소리 선택 초기화)');
      }
    } catch {
      // 동기화에 실패해도 재생은 시스템 기본으로 동작한다
    }
  }, []);

  // 화면 진입 시 + 시스템 설정에 다녀와 앱이 다시 활성화될 때 동기화.
  // 시스템 설정은 별도 액티비티라 화면 포커스 이벤트가 오지 않으므로 AppState 로 잡는다.
  useEffect(() => {
    if (!supportsEngineSelection) return;
    void syncEngines();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncEngines();
    });
    return () => sub.remove();
  }, [syncEngines]);

  const books = listBooks();
  const wordCount = books.reduce((sum, book) => sum + book.wordCount, 0);

  const info: { label: string; value: string }[] = [
    { label: '책', value: `${books.length}권` },
    { label: '단어', value: `${wordCount.toLocaleString('ko-KR')}개` },
    { label: '버전', value: Constants.expoConfig?.version ?? '-' },
  ];

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.title}>목소리</Text>

        {engineKind === 'html5' ? (
          <Text style={[styles.note, { color: muted }]}>
            웹은 개발 확인용입니다. 브라우저 음성으로 읽으며, 실제 동작은 앱에서 확인하세요.
          </Text>
        ) : supportsEngineSelection ? (
          <Text style={[styles.note, { color: muted }]}>
            기기에 설치된 시스템 TTS 로 읽습니다. 한국어 문장과 영어 문장을 각각 아래 목소리로
            읽습니다.
          </Text>
        ) : (
          <Text style={[styles.note, { color: muted }]}>
            내장 음성으로 읽습니다. 한국어 문장과 영어 문장을 각각 아래 목소리로 읽습니다.
          </Text>
        )}

        {supportsVoiceSelection ? (
          <>
            <VoicePicker
              lang="en"
              label="영어 목소리"
              autoLabel="자동 (권장)"
              reloadKey={voiceListVersion}
            />
            <VoicePicker
              lang="ko"
              label="한국어 목소리"
              autoLabel="시스템 기본"
              reloadKey={voiceListVersion}
            />
          </>
        ) : null}

        {supportsEngineSelection ? (
          <>
            <Pressable
              onPress={() => void openSystemTtsSettings()}
              style={({ pressed }) => [
                styles.button,
                { borderColor: tint, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text style={[styles.buttonText, { color: tint }]}>시스템 설정 열기</Text>
            </Pressable>
            <Text style={[styles.note, { color: muted }]}>
              엔진·말하기 속도·음높이는 시스템 설정(&quot;글자 읽어주기&quot;)에서 바꿉니다. 바꾸고
              앱으로 돌아오면 자동으로 반영되며, 엔진을 바꾸면 위 목소리 목록도 새 엔진 것으로
              바뀝니다.
            </Text>
          </>
        ) : engineKind === 'system' ? (
          <Text style={[styles.note, { color: muted }]}>
            더 자연스러운 목소리는 설정 → 손쉬운 사용 → 콘텐츠 말하기 → 음성에서 내려받을 수
            있습니다.
          </Text>
        ) : null}

        {!supportsPause ? (
          <Text style={[styles.note, { color: muted }]}>
            이 기기는 낭독 중 일시정지를 지원하지 않아, 멈추면 읽던 단어의 처음부터 다시
            재생합니다.
          </Text>
        ) : null}

        {notice ? (
          <Text style={[styles.notice, { color: tint }]} onPress={() => setNotice(null)}>
            {notice}
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.title}>정보</Text>
        {info.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={[styles.note, { color: muted }]}>{row.label}</Text>
            <Text style={styles.note}>{row.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    lineHeight: 21,
  },
  notice: {
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
