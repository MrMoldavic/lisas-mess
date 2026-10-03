import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { useShop } from '@/hooks/useShop';
import { useTheme } from '@/hooks/useTheme';

type FabricPatternProps = {
  /** A given pattern, for shop previews; the equipped one otherwise. */
  pattern?: string | null;
};

/** The motif printed on the background fabric (dots, checks), drawn behind a screen's content. */
export function FabricPattern({ pattern }: FabricPatternProps) {
  const { colors } = useTheme();
  const shop = useShop();
  const motif = pattern === undefined ? shop.pattern : pattern;
  if (!motif) return null;

  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Defs>
        {motif === 'pois' && (
          <Pattern id="motif" width={26} height={26} patternUnits="userSpaceOnUse">
            <Circle cx={6.5} cy={6.5} r={2.6} fill={colors.stitch} opacity={0.45} />
            <Circle cx={19.5} cy={19.5} r={2.6} fill={colors.stitch} opacity={0.45} />
          </Pattern>
        )}
        {motif === 'carreaux' && (
          <Pattern id="motif" width={28} height={28} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={28} height={14} fill={colors.stitch} opacity={0.16} />
            <Rect x={0} y={0} width={14} height={28} fill={colors.stitch} opacity={0.16} />
          </Pattern>
        )}
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#motif)" />
    </Svg>
  );
}
