import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import { GroundShadow, usePaint } from './CompanionPaint';

/** Same frame as Bobine (60×70), so any companion takes her place without moving the layout. */
const VIEW_BOX = '0 0 60 70';
const INK = '#3A2A26';
const NEEDLE = '#A9B0B8';

type AvatarProps = { size?: number; shadow?: boolean };

/** Bobine's face (eyes, cheeks, smile), centred on x = 30 with its eyes at `y`. */
function Face({ y, spread = 7 }: { y: number; spread?: number }) {
  const paint = usePaint();
  return (
    <G>
      <Circle cx={30 - spread} cy={y} r={3} fill={paint(INK)} />
      <Circle cx={30 + spread} cy={y} r={3} fill={paint(INK)} />
      <Circle cx={31 - spread} cy={y - 1} r={1} fill={paint('#FFFFFF')} />
      <Circle cx={31 + spread} cy={y - 1} r={1} fill={paint('#FFFFFF')} />
      <Ellipse cx={25 - spread} cy={y + 6} rx={3.6} ry={2.2} fill={paint('#FFB0C5')} />
      <Ellipse cx={35 + spread} cy={y + 6} rx={3.6} ry={2.2} fill={paint('#FFB0C5')} />
      <Path
        d={`M26.5 ${y + 6} Q30 ${y + 9.5} 33.5 ${y + 6}`}
        fill="none"
        stroke={paint(INK)}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </G>
  );
}

/** Pique: the tomato pincushion, with its green leaves and two pins stuck in. */
export function Pique({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();
  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <Path d="M16 34 L7 20" stroke={paint(NEEDLE)} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={7} cy={20} r={2.8} fill={paint('#36A89F')} />
      <Path d="M45 32 L54 19" stroke={paint(NEEDLE)} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={54} cy={19} r={2.8} fill={paint('#EDB847')} />
      <Ellipse cx={30} cy={45} rx={24} ry={19} fill={paint('#EF6B57')} />
      <Path d="M30 27 Q14 36 17 61" stroke={paint('#D2503D')} strokeWidth={1.4} fill="none" />
      <Path d="M30 27 Q46 36 43 61" stroke={paint('#D2503D')} strokeWidth={1.4} fill="none" />
      <Rect x={29} y={17} width={2} height={7} rx={1} fill={paint('#2E7D4F')} />
      <Ellipse cx={24} cy={26} rx={6.5} ry={2.6} fill={paint('#3FA46A')} transform="rotate(-25 24 26)" />
      <Ellipse cx={36} cy={26} rx={6.5} ry={2.6} fill={paint('#3FA46A')} transform="rotate(25 36 26)" />
      <Ellipse cx={30} cy={27} rx={2.6} ry={5} fill={paint('#3FA46A')} />
      <Face y={44} />
    </Svg>
  );
}

/** Animals are drawn as heads only: enlarged by a quarter around the head centre and lowered to fill the frame. */
const HEAD_ONLY = 'translate(30 37) scale(1.25) translate(-30 -34)';

/** Myopie: a white and gold Shih Tzu head, long floppy ears and a raspberry bow on its topknot. */
export function Myopie({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();
  const fur = '#F6EEE3';
  const gold = '#E2B98A';

  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <G transform={HEAD_ONLY}>
        <Ellipse cx={14} cy={42} rx={7} ry={14} fill={paint('#C8925A')} transform="rotate(12 14 42)" />
        <Ellipse cx={46} cy={42} rx={7} ry={14} fill={paint('#C8925A')} transform="rotate(-12 46 42)" />
        <Ellipse cx={30} cy={34} rx={17} ry={16} fill={paint(fur)} />
        <Path d="M23 21 Q30 7 37 21 Z" fill={paint(gold)} />
        <Ellipse cx={22} cy={31} rx={7} ry={6} fill={paint(gold)} />
        <Ellipse cx={38} cy={31} rx={7} ry={6} fill={paint(gold)} />
        <Path d="M30 15 L23 11 L23 19 Z" fill={paint('#E4577E')} />
        <Path d="M30 15 L37 11 L37 19 Z" fill={paint('#E4577E')} />
        <Circle cx={30} cy={15} r={2} fill={paint('#BC3D61')} />
        <Ellipse cx={30} cy={42} rx={7.5} ry={5.5} fill={paint('#FFFFFF')} />
        <Circle cx={23} cy={32} r={3} fill={paint(INK)} />
        <Circle cx={37} cy={32} r={3} fill={paint(INK)} />
        <Circle cx={24} cy={31} r={1} fill={paint('#FFFFFF')} />
        <Circle cx={38} cy={31} r={1} fill={paint('#FFFFFF')} />
        <Ellipse cx={17} cy={39} rx={3.4} ry={2.1} fill={paint('#FFB0C5')} />
        <Ellipse cx={43} cy={39} rx={3.4} ry={2.1} fill={paint('#FFB0C5')} />
        <Ellipse cx={30} cy={38.8} rx={2.6} ry={1.9} fill={paint(INK)} />
        <Ellipse cx={30} cy={44.8} rx={1.6} ry={1.3} fill={paint('#FF8FA8')} />
        <Path
          d="M27 42.5 Q28.5 44.5 30 42.5 Q31.5 44.5 33 42.5"
          fill="none"
          stroke={paint(INK)}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

/** Jean-Miette: a dark grey tabby cat head, striped forehead and green eyes. */
export function JeanMiette({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();
  const coat = '#4A4F57';
  const stripe = { stroke: paint('#2E3238'), strokeWidth: 2, strokeLinecap: 'round' as const, fill: 'none' };
  const whisker = { stroke: paint('#C9CDD2'), strokeWidth: 0.9, strokeLinecap: 'round' as const };

  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <G transform={HEAD_ONLY}>
        <Path d="M14 31 L17 11 L28 22 Z" fill={paint(coat)} />
        <Path d="M46 31 L43 11 L32 22 Z" fill={paint(coat)} />
        <Path d="M18 26 L19 16 L25 22 Z" fill={paint('#F3A6B8')} />
        <Path d="M42 26 L41 16 L35 22 Z" fill={paint('#F3A6B8')} />
        <Ellipse cx={30} cy={34} rx={17} ry={15} fill={paint(coat)} />
        <Path d="M30 20 L30 26" {...stripe} />
        <Path d="M25 21 Q26 24 26 27" {...stripe} />
        <Path d="M35 21 Q34 24 34 27" {...stripe} />
        <Path d="M13.5 33 L18 34" {...stripe} />
        <Path d="M13.5 37 L18 37" {...stripe} />
        <Path d="M46.5 33 L42 34" {...stripe} />
        <Path d="M46.5 37 L42 37" {...stripe} />
        <Ellipse cx={30} cy={40.5} rx={7} ry={4.5} fill={paint('#6B717A')} />
        {/* Light eyes with slit pupils: black ones would vanish on the dark coat. */}
        <Ellipse cx={23} cy={32} rx={3.4} ry={3.6} fill={paint('#C9E36B')} />
        <Ellipse cx={37} cy={32} rx={3.4} ry={3.6} fill={paint('#C9E36B')} />
        <Ellipse cx={23} cy={32} rx={1.2} ry={2.8} fill={paint(INK)} />
        <Ellipse cx={37} cy={32} rx={1.2} ry={2.8} fill={paint(INK)} />
        <Circle cx={24.2} cy={30.8} r={0.9} fill={paint('#FFFFFF')} />
        <Circle cx={38.2} cy={30.8} r={0.9} fill={paint('#FFFFFF')} />
        <Ellipse cx={17.5} cy={39} rx={3.2} ry={2} fill={paint('#F3A6B8')} opacity={0.75} />
        <Ellipse cx={42.5} cy={39} rx={3.2} ry={2} fill={paint('#F3A6B8')} opacity={0.75} />
        <Path d="M28 37.5 L32 37.5 L30 40 Z" fill={paint('#F3A6B8')} />
        <Path
          d="M27 42 Q28.5 43.8 30 41.6 Q31.5 43.8 33 42"
          fill="none"
          stroke={paint('#1F2226')}
          strokeWidth={1.3}
          strokeLinecap="round"
        />
        <Path d="M22 40 L11 38" {...whisker} />
        <Path d="M22 42 L11 43.5" {...whisker} />
        <Path d="M38 40 L49 38" {...whisker} />
        <Path d="M38 42 L49 43.5" {...whisker} />
      </G>
    </Svg>
  );
}

/** Roucoule: a small grey pigeon, iridescent neck and barred wing. */
export function Roucoule({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();
  const feather = '#9AA6B4';

  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <Path d="M44 50 L56 56 L54 61 L42 57 Z" fill={paint('#7D8996')} />
      <Ellipse cx={30} cy={47} rx={18} ry={15} fill={paint(feather)} />
      <Ellipse cx={39} cy={49} rx={9} ry={10} fill={paint('#7D8996')} transform="rotate(-20 39 49)" />
      <Path d="M34 47 Q39 45 44 49" stroke={paint('#4E5966')} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M34 52 Q39 50 44 54" stroke={paint('#4E5966')} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M24 61 L24 64.5 M21.5 64.5 L26.5 64.5" stroke={paint('#E58F9E')} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M35 61 L35 64.5 M32.5 64.5 L37.5 64.5" stroke={paint('#E58F9E')} strokeWidth={1.8} strokeLinecap="round" />
      <Ellipse cx={28} cy={35} rx={11} ry={5.5} fill={paint('#7BAF9A')} />
      <Ellipse cx={28} cy={37} rx={10} ry={3.8} fill={paint('#9C86C2')} />
      <Circle cx={28} cy={25} r={11.5} fill={paint(feather)} />
      <Path d="M17.5 26 L11 28.5 L17.5 30.5 Z" fill={paint('#3A2A26')} />
      <Ellipse cx={18} cy={25.6} rx={1.8} ry={1.3} fill={paint('#F2EEE8')} />
      <Circle cx={24} cy={24} r={2.7} fill={paint(INK)} />
      <Circle cx={33} cy={24} r={2.7} fill={paint(INK)} />
      <Circle cx={25} cy={23} r={0.9} fill={paint('#FFFFFF')} />
      <Circle cx={34} cy={23} r={0.9} fill={paint('#FFFFFF')} />
      <Ellipse cx={21} cy={30} rx={2.8} ry={1.7} fill={paint('#FFB0C5')} />
      <Ellipse cx={36} cy={30} rx={2.8} ry={1.7} fill={paint('#FFB0C5')} />
    </Svg>
  );
}

/** Perforations of the stamp, along its four edges. */
const PERFORATIONS: [number, number][] = [
  ...[15, 20, 25, 30, 35, 40, 45].flatMap((x): [number, number][] => [[x, 12], [x, 58]]),
  ...[17, 22, 27, 32, 37, 42, 47, 52].flatMap((y): [number, number][] => [[12, y], [48, y]]),
];

/** Timbré: a postage stamp with a little landscape, a postmark and a smile. */
export function Timbre({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();

  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <G transform="rotate(-6 30 35)">
        <Rect x={12} y={12} width={36} height={46} fill={paint('#FFF9F0')} />
        {PERFORATIONS.map(([cx, cy]) => (
          <Circle key={`${cx},${cy}`} cx={cx} cy={cy} r={2.3} fill={paint('#FFF9F0')} />
        ))}
        <Rect x={16} y={16} width={28} height={38} rx={1.5} fill={paint('#C6E6F5')} />
        <Circle cx={38} cy={22} r={3} fill={paint('#EDB847')} />
        <Path d="M16 46 Q25 39 34 44 Q39 46.5 44 43 L44 54 L16 54 Z" fill={paint('#3FA46A')} />
        <Circle cx={44} cy={17} r={7} stroke={paint('rgba(58,42,38,0.35)')} strokeWidth={1} fill="none" />
        <Path
          d="M40 13 Q43 11.5 46 13 Q49 14.5 52 13 M40 17 Q43 15.5 46 17 Q49 18.5 52 17"
          stroke={paint('rgba(58,42,38,0.35)')}
          strokeWidth={1}
          fill="none"
        />
        <Face y={32} spread={6} />
      </G>
    </Svg>
  );
}

/** Chaussette: a striped raspberry sock with its cuff, heel and toe, smiling from the ankle. */
export function Chaussette({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();
  const sock = 'M18 12 L36 12 L36 38 Q36 44 43 46 L50 48.5 Q57 51 55 58 Q53 64 46 63 L30 61 Q18 59 18 47 Z';

  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <Defs>
        <ClipPath id="chaussette">
          <Path d={sock} />
        </ClipPath>
      </Defs>
      <Path d={sock} fill={paint('#E4577E')} />
      <G clipPath="url(#chaussette)">
        <Rect x={18} y={19} width={18} height={4} fill={paint('#FFF9F0')} />
        <Rect x={18} y={28} width={18} height={4} fill={paint('#FFF9F0')} />
        <Ellipse cx={20} cy={58} rx={8} ry={6} fill={paint('#BC3D61')} />
        <Ellipse cx={55} cy={56} rx={6} ry={8} fill={paint('#BC3D61')} />
      </G>
      <Rect x={16.5} y={7} width={21} height={8} rx={2.5} fill={paint('#FFF9F0')} />
      <Path d="M21 8.5 L21 13.5 M25 8.5 L25 13.5 M29 8.5 L29 13.5 M33 8.5 L33 13.5" stroke={paint('#E9DCCB')} strokeWidth={1.2} />
      <G transform="translate(3 0)">
        <Face y={47} spread={5} />
      </G>
    </Svg>
  );
}

/** Grignote: a grey mouse head, big pink ears, buck teeth and whiskers. */
export function Grignote({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();
  const whisker = { stroke: paint('#8E8880'), strokeWidth: 0.9, strokeLinecap: 'round' as const };

  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <G transform={HEAD_ONLY}>
        <Circle cx={16} cy={21} r={9} fill={paint('#A9A39C')} />
        <Circle cx={44} cy={21} r={9} fill={paint('#A9A39C')} />
        <Circle cx={16} cy={21} r={5.5} fill={paint('#F3A6B8')} />
        <Circle cx={44} cy={21} r={5.5} fill={paint('#F3A6B8')} />
        <Ellipse cx={30} cy={35} rx={15} ry={14} fill={paint('#C9C4BD')} />
        <Ellipse cx={30} cy={42} rx={6.5} ry={4.5} fill={paint('#DAD6D0')} />
        <Circle cx={24} cy={33} r={2.8} fill={paint(INK)} />
        <Circle cx={36} cy={33} r={2.8} fill={paint(INK)} />
        <Circle cx={25} cy={32} r={0.9} fill={paint('#FFFFFF')} />
        <Circle cx={37} cy={32} r={0.9} fill={paint('#FFFFFF')} />
        <Ellipse cx={19.5} cy={39} rx={3} ry={1.9} fill={paint('#FFB0C5')} />
        <Ellipse cx={40.5} cy={39} rx={3} ry={1.9} fill={paint('#FFB0C5')} />
        <Circle cx={30} cy={40} r={2} fill={paint('#F08BA5')} />
        <Path
          d="M27.5 43.5 Q29 45 30 43.6 Q31 45 32.5 43.5"
          fill="none"
          stroke={paint(INK)}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <Rect x={28.8} y={44.2} width={2.4} height={2.4} rx={0.5} fill={paint('#FFFFFF')} />
        <Path d="M24 41 L14 39 M24 43 L14 44.5" {...whisker} />
        <Path d="M36 41 L46 39 M36 43 L46 44.5" {...whisker} />
      </G>
    </Svg>
  );
}

const CUBE_COLORS = ['#E5533D', '#FFFFFF', '#4F9BD1', '#3FA46A', '#F2C94C', '#F28C3B'];
/** Scrambled stickers of the three visible faces, as indexes into `CUBE_COLORS`. */
const CUBE_FRONT = [0, 4, 2, 3, 1, 0, 5, 2, 4];
const CUBE_TOP = [1, 3, 0, 4, 5, 2, 2, 1, 3];
const CUBE_SIDE = [3, 5, 4, 2, 0, 1, 5, 3, 0];
/** Depth of the oblique projection, in drawing units. */
const CUBE_DEPTH = 8;

/** Corners of a sticker, shrunk toward its center to leave the black gaps. */
function sticker(corners: [number, number][]): string {
  const cx = corners.reduce((sum, [x]) => sum + x, 0) / 4;
  const cy = corners.reduce((sum, [, y]) => sum + y, 0) / 4;
  return corners.map(([x, y]) => `${cx + (x - cx) * 0.8},${cy + (y - cy) * 0.8}`).join(' ');
}

/** Cubik: a scrambled Rubik's cube with googly eyes, drawn in oblique projection. */
export function Cubik({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();
  const step = CUBE_DEPTH / 3;
  const cells = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => ({ row, col, index: row * 3 + col })));

  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <G transform="translate(30 38) scale(1.3) translate(-33 -35)">
        <Polygon points="14,24 22,16 52,16 52,46 44,54 14,54" fill={paint('#2B2B2B')} />
        {cells.map(({ row, col, index }) => (
          <Polygon
            key={`front-${index}`}
            points={sticker([
              [14 + col * 10, 24 + row * 10],
              [24 + col * 10, 24 + row * 10],
              [24 + col * 10, 34 + row * 10],
              [14 + col * 10, 34 + row * 10],
            ])}
            fill={paint(CUBE_COLORS[CUBE_FRONT[index]])}
          />
        ))}
        {cells.map(({ row, col, index }) => {
          // Rows go back in depth, columns go right.
          const back = 2 - row;
          return (
            <Polygon
              key={`top-${index}`}
              points={sticker([
                [14 + col * 10 + back * step, 24 - back * step],
                [24 + col * 10 + back * step, 24 - back * step],
                [24 + col * 10 + (back + 1) * step, 24 - (back + 1) * step],
                [14 + col * 10 + (back + 1) * step, 24 - (back + 1) * step],
              ])}
              fill={paint(CUBE_COLORS[CUBE_TOP[index]])}
            />
          );
        })}
        {cells.map(({ row, col, index }) => (
          <Polygon
            key={`side-${index}`}
            points={sticker([
              [44 + col * step, 24 + row * 10 - col * step],
              [44 + (col + 1) * step, 24 + row * 10 - (col + 1) * step],
              [44 + (col + 1) * step, 34 + row * 10 - (col + 1) * step],
              [44 + col * step, 34 + row * 10 - col * step],
            ])}
            fill={paint(CUBE_COLORS[CUBE_SIDE[index]])}
          />
        ))}
        <Circle cx={23} cy={35} r={4.6} fill={paint('#FFFFFF')} stroke={paint(INK)} strokeWidth={0.9} />
        <Circle cx={35} cy={35} r={4.6} fill={paint('#FFFFFF')} stroke={paint(INK)} strokeWidth={0.9} />
        <Circle cx={24} cy={36} r={2.3} fill={paint(INK)} />
        <Circle cx={36} cy={36} r={2.3} fill={paint(INK)} />
        <Path d="M23.5 45 Q29 53 34.5 45 Z" fill={paint(INK)} stroke={paint('#FFFFFF')} strokeWidth={0.8} />
        <Ellipse cx={29} cy={48.6} rx={2.6} ry={1.3} fill={paint('#FF8FA8')} />
      </G>
    </Svg>
  );
}

/** Pif: a big nose seen in profile, its two eyes on the bridge like the pigeon's, with golden sparkles. */
export function Pif({ size = 60, shadow = true }: AvatarProps) {
  const paint = usePaint();
  const sparkle = (x: number, y: number, r: number) =>
    `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;

  return (
    <Svg width={size} height={(size * 70) / 60} viewBox={VIEW_BOX}>
      {shadow && <GroundShadow />}
      <Path
        d="M30 6 Q26 26 16 40 Q8 50 13 57 Q18 62 25 58 Q29 62 35 60 Q41 61 45 56 Q50 46 46 30 Q44 16 38 6 Q34 3 30 6 Z"
        fill={paint('#F2B8A2')}
      />
      <Path d="M33 47 Q39 49 37.5 56" stroke={paint('#D9937E')} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Ellipse cx={26.5} cy={56} rx={3.4} ry={1.8} fill={paint('#B9715E')} transform="rotate(-15 26.5 56)" />
      <Ellipse cx={16.5} cy={47} rx={2.4} ry={3.4} fill={paint('#FFFFFF')} opacity={0.55} />
      <Ellipse cx={26} cy={32} rx={3} ry={1.9} fill={paint('#FFB0C5')} />
      <Ellipse cx={42.5} cy={32} rx={2.6} ry={1.9} fill={paint('#FFB0C5')} />
      <Circle cx={30} cy={25} r={3} fill={paint(INK)} />
      <Circle cx={39} cy={25} r={3} fill={paint(INK)} />
      <Circle cx={31} cy={24} r={1} fill={paint('#FFFFFF')} />
      <Circle cx={40} cy={24} r={1} fill={paint('#FFFFFF')} />
      <Path d="M26.5 19.5 Q30 17 33.5 19" stroke={paint(INK)} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M35.5 19 Q39 17 42.5 19.5" stroke={paint(INK)} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d={sparkle(53, 30, 4)} fill={paint('#EDB847')} />
      <Path d={sparkle(8, 26, 3)} fill={paint('#EDB847')} />
      <Path d={sparkle(51, 8, 2.5)} fill={paint('#EDB847')} />
    </Svg>
  );
}
