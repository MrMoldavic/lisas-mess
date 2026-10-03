import { StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

const INK = '#3A2A26';

type Eye = { x: number; y: number };

/** Where each companion's eyes are in the 60×70 frame, and how big a lens fits around them. */
const EYES: Record<string, { left: Eye; right: Eye; r: number }> = {
  bobine: { left: { x: 23, y: 38 }, right: { x: 37, y: 38 }, r: 5 },
  chaussette: { left: { x: 28, y: 47 }, right: { x: 38, y: 47 }, r: 4.5 },
  timbre: { left: { x: 23.7, y: 32.6 }, right: { x: 35.7, y: 31.4 }, r: 4.5 },
  pique: { left: { x: 23, y: 44 }, right: { x: 37, y: 44 }, r: 5 },
  roucoule: { left: { x: 24, y: 24 }, right: { x: 33, y: 24 }, r: 3.6 },
  grignote: { left: { x: 22.5, y: 35.8 }, right: { x: 37.5, y: 35.8 }, r: 5 },
  myopie: { left: { x: 21.3, y: 34.5 }, right: { x: 38.8, y: 34.5 }, r: 5.5 },
  'jean-miette': { left: { x: 21.3, y: 34.5 }, right: { x: 38.8, y: 34.5 }, r: 5.5 },
  cubik: { left: { x: 17, y: 38 }, right: { x: 32.6, y: 38 }, r: 6.8 },
  pif: { left: { x: 30, y: 25 }, right: { x: 39, y: 25 }, r: 3.8 },
};

type AccessoryLayerProps = {
  accessory: string;
  /** Companion wearing it, to find its eyes. */
  avatar: string;
  size: number;
};

/** An accessory drawn over a companion, in the same frame so it lands on the right spot. */
export function AccessoryLayer({ accessory, avatar, size }: AccessoryLayerProps) {
  const { left, right, r } = EYES[avatar] ?? EYES.bobine;
  const bridge = `M${left.x + r} ${left.y} Q${(left.x + right.x) / 2} ${Math.min(left.y, right.y) - r * 0.5} ${right.x - r} ${right.y}`;
  const temples = `M${left.x - r} ${left.y} L${left.x - r - 3} ${left.y - 1} M${right.x + r} ${right.y} L${right.x + r + 3} ${right.y - 1}`;

  return (
    <Svg
      width={size}
      height={(size * 70) / 60}
      viewBox="0 0 60 70"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {accessory === 'lunettes' && (
        <G>
          <Circle cx={left.x} cy={left.y} r={r} stroke={INK} strokeWidth={1.4} fill="rgba(255,255,255,0.25)" />
          <Circle cx={right.x} cy={right.y} r={r} stroke={INK} strokeWidth={1.4} fill="rgba(255,255,255,0.25)" />
          <Path d={bridge} stroke={INK} strokeWidth={1.4} fill="none" />
          <Path d={temples} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
        </G>
      )}
      {accessory === 'lunettes-star' && (
        <G>
          <Ellipse cx={left.x} cy={left.y} rx={r + 1} ry={r} fill="#2B2B2B" stroke="#E4577E" strokeWidth={1.3} />
          <Ellipse cx={right.x} cy={right.y} rx={r + 1} ry={r} fill="#2B2B2B" stroke="#E4577E" strokeWidth={1.3} />
          <Path
            d={`M${left.x - r * 0.5} ${left.y - r * 0.2} L${left.x} ${left.y - r * 0.6} M${right.x - r * 0.5} ${right.y - r * 0.2} L${right.x} ${right.y - r * 0.6}`}
            stroke="#FFFFFF"
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.7}
          />
          <Path d={bridge} stroke="#E4577E" strokeWidth={1.3} fill="none" />
          <Path d={temples} stroke="#E4577E" strokeWidth={1.3} strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}
