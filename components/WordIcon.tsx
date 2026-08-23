import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

/**
 * 단어 아이콘 (word_svgs 의 SVG).
 * 아이콘이 없는 단어가 26개 있으므로 빈 자리를 그대로 비워 둔다.
 */
export default function WordIcon({
  xml,
  size = 96,
  color,
}: {
  xml?: string;
  size?: number;
  color: string;
}) {
  /**
   * 아이콘은 검정으로 그려져 있어 다크 모드에서 보이지 않는다 — 테마 색으로 바꾼다.
   * 두 종류가 섞여 있다.
   *   potrace 출력      : <g ... fill="#000000">  -> 명시된 검정을 치환
   *   Illustrator 출력  : fill 속성이 아예 없음    -> 루트 <svg> 에 fill 을 넣어 상속시킴
   */
  const tinted = useMemo(() => {
    if (!xml) return undefined;
    const replaced = xml.replace(/fill="(#0{3,8}|#000|black)"/gi, `fill="${color}"`);
    return replaced.replace(/<svg\b/, `<svg fill="${color}"`);
  }, [xml, color]);

  if (!tinted) return <View style={{ width: size, height: size }} />;

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <SvgXml xml={tinted} width="100%" height="100%" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
