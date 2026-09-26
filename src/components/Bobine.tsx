import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/**
 * Bobine, la mascotte de l'atelier : une bobine de fil framboise avec un
 * visage, et son aiguille. Dessinée en vectoriel pour rester nette à toutes les
 * tailles ; ses couleurs sont fixes, c'est un personnage, pas un élément de thème.
 */
export function Bobine({ size = 60 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 70) / 60} viewBox="0 0 60 70">
      <Ellipse cx={30} cy={66} rx={18} ry={3} fill="rgba(90,50,20,0.15)" />
      <Rect x={12} y={14} width={36} height={44} rx={6} fill="#E4577E" />
      <Path d="M12 22h36M12 30h36M12 50h36" stroke="#C94369" strokeWidth={1.6} />
      <Rect x={6} y={8} width={48} height={9} rx={4.5} fill="#D9A26B" />
      <Rect x={6} y={55} width={48} height={9} rx={4.5} fill="#C48A57" />
      <Circle cx={23} cy={38} r={3} fill="#3A2A26" />
      <Circle cx={37} cy={38} r={3} fill="#3A2A26" />
      <Circle cx={24} cy={37} r={1} fill="#FFFFFF" />
      <Circle cx={38} cy={37} r={1} fill="#FFFFFF" />
      <Ellipse cx={18} cy={44} rx={3.6} ry={2.2} fill="#FFB0C5" />
      <Ellipse cx={42} cy={44} rx={3.6} ry={2.2} fill="#FFB0C5" />
      <Path
        d="M26.5 44 Q30 47.5 33.5 44"
        fill="none"
        stroke="#3A2A26"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M48 26 Q56 24 57 16" fill="none" stroke="#E4577E" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M53 4 L59 16" stroke="#A9B0B8" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
