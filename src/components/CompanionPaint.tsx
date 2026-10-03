import { createContext, useContext } from 'react';
import { Ellipse } from 'react-native-svg';

/** When set, companion drawings paint every shape in this one color, to build their sticker outline. */
export const SilhouetteContext = createContext<string | null>(null);

/** The color to paint a shape with: its own, or the silhouette color inside an outline copy. */
export function usePaint(): (color: string) => string {
  const silhouette = useContext(SilhouetteContext);
  return (color) => silhouette ?? color;
}

/** Ground shadow under a companion, never drawn in an outline copy. */
export function GroundShadow() {
  const silhouette = useContext(SilhouetteContext);
  if (silhouette) return null;
  return <Ellipse cx={30} cy={66} rx={18} ry={3} fill="rgba(90,50,20,0.15)" />;
}
