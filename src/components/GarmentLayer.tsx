import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useAnimatedValue,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTheme } from '@/hooks/useTheme';
import { clampLayout } from '@/services';
import type { Piece, PieceLayout } from '@/services';
import { OUTFIT_SLOTS } from '@/types';

import { bandRect } from './SlotBands';
import type { Rect } from './SlotBands';

export type Canvas = { width: number; height: number };

type GarmentLayerProps = {
  pieces: Piece[];
  index: number;
  /** Rang du poste dans `OUTFIT_SLOTS` : fixe sa zone et sa position de repos. */
  slot: number;
  canvas: Canvas;
  layout: PieceLayout;
  onIndexChange?: (next: number) => void;
  onLayoutChange?: (piece: Piece, layout: PieceLayout) => void;
  /** Flèches de défilement, inutiles hors du composeur. */
  showArrows?: boolean;
  /** `false` affiche sans attacher de geste (vignettes de la grille). */
  interactive?: boolean;
  /** Cadenas à côté des flèches : un poste verrouillé est épargné par le tirage au sort. */
  locked?: boolean;
  onToggleLock?: () => void;
};

/**
 * Inclinaison de sticker, en degrés. Le **sens** vient du poste (`tilt` dans
 * `OUTFIT_SLOTS`, pour que haut, bas et chaussures alternent) ; l'**amplitude**,
 * entre 1,5° et 4°, est tirée de l'identifiant pour qu'une pièce garde toujours
 * le même angle d'un écran à l'autre.
 */
function tiltFor(id: string, direction: 1 | -1): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return direction * (1.5 + (Math.abs(hash) % 26) / 10);
}

/** Directions des copies blanches qui dessinent le liseré autour de la pièce. */
const OUTLINE_DIRECTIONS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71],
];

/** Proportions (largeur / hauteur) déjà lues, pour ne pas redemander à chaque rendu. */
const aspectRatios = new Map<string, number>();

/** Proportions de l'image, `null` tant qu'elles ne sont pas connues. */
function useAspectRatio(uri: string | null): number | null {
  const [ratio, setRatio] = useState<number | null>(uri ? aspectRatios.get(uri) ?? null : null);

  useEffect(() => {
    if (!uri) {
      setRatio(null);
      return;
    }

    const known = aspectRatios.get(uri);
    if (known) {
      setRatio(known);
      return;
    }

    let active = true;
    Image.getSize(
      uri,
      (width, height) => {
        const next = height > 0 ? width / height : 1;
        aspectRatios.set(uri, next);
        if (active) setRatio(next);
      },
      // Illisible : on dessine quand même, dans un cadre carré.
      () => {
        if (active) setRatio(1);
      }
    );

    return () => {
      active = false;
    };
  }, [uri]);

  return ratio;
}

const MIN_DRAG = 6;
const SLIDE_OUT = 160;
const SLIDE_IN = 200;

type Geometry = {
  /** Zone où le vêtement doit rester, dans le repère de l'encart. */
  inner: Rect;
  /** Calque : encombrement du vêtement incliné, collé au bord d'ancrage. */
  box: { left: number; top: number; width: number; height: number };
  /** Image non inclinée, centrée dans le calque. */
  photo: { left: number; top: number; width: number; height: number };
  /** Point fixe vertical du pincement, en fraction du calque (0 haut, 1 bas). */
  originY: number;
};

/**
 * Cadre le vêtement dans son encart : l'image entière (`contain`), réduite si
 * besoin pour que sa version **inclinée** tienne aussi, avec une marge qui
 * laisse la place au liseré et à l'ombre.
 */
function fitInBand(
  band: Rect,
  ratio: number,
  tiltDeg: number,
  outline: number,
  anchor: 'start' | 'center' | 'end'
): Geometry {
  const pad = outline * 3;
  const inner = {
    x: pad,
    y: pad,
    width: Math.max(1, band.width - 2 * pad),
    height: Math.max(1, band.height - 2 * pad),
  };

  const photoWidth = inner.width / inner.height > ratio ? inner.height * ratio : inner.width;
  const photoHeight = photoWidth / ratio;

  const angle = (Math.abs(tiltDeg) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tiltedWidth = photoWidth * cos + photoHeight * sin;
  const tiltedHeight = photoWidth * sin + photoHeight * cos;
  const fit = Math.min(1, inner.width / tiltedWidth, inner.height / tiltedHeight);

  const width = tiltedWidth * fit;
  const height = tiltedHeight * fit;
  const originY = anchor === 'start' ? 0 : anchor === 'end' ? 1 : 0.5;

  return {
    inner,
    box: {
      left: inner.x + (inner.width - width) / 2,
      top: inner.y + (inner.height - height) * originY,
      width,
      height,
    },
    photo: {
      left: (width - photoWidth * fit) / 2,
      top: (height - photoHeight * fit) / 2,
      width: photoWidth * fit,
      height: photoHeight * fit,
    },
    originY,
  };
}

function clampTo(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Ramène un cadrage dans l'encart : échelle plafonnée à 1 (le vêtement occupe
 * déjà toute la place disponible), puis décalage borné pour que le calque mis à
 * l'échelle ne dépasse d'aucun côté.
 */
function containLayout(layout: PieceLayout, geometry: Geometry, canvas: Canvas): PieceLayout {
  if (canvas.width === 0 || canvas.height === 0) return layout;

  const { inner, box, originY } = geometry;
  const scale = Math.min(1, layout.scale);
  const left = box.left + box.width * 0.5 * (1 - scale);
  const top = box.top + box.height * originY * (1 - scale);

  const x = clampTo(
    layout.offsetX * canvas.width,
    inner.x - left,
    inner.x + inner.width - left - box.width * scale
  );
  const y = clampTo(
    layout.offsetY * canvas.height,
    inner.y - top,
    inner.y + inner.height - top - box.height * scale
  );

  return { scale, offsetX: x / canvas.width, offsetY: y / canvas.height };
}

/**
 * Un vêtement posé dans l'encart de son poste.
 *
 * Le vêtement **ne sort jamais de son encart** : il y est cadré entier, le
 * pincement ne l'agrandit pas au-delà, le glisser est borné à ses limites, et
 * l'encart découpe ce qui dépasserait pendant l'animation des flèches.
 *
 * L'image est **collée au bord qui touche la taille** : les hauts en bas de leur
 * encart, les bas et les chaussures en haut. Un short s'arrête ainsi plus haut
 * qu'un pantalon au lieu d'être centré, et les proportions de l'image ne
 * décalent plus la ceinture. Le pincement réduit depuis ce même bord, pour que
 * la ceinture reste en place.
 *
 * Chaque pièce est dessinée comme un **sticker** : un liseré blanc et une ombre
 * portée, faits de copies teintées de la même image, la rendent lisible sur
 * n'importe quel fond, y compris une pièce noire en mode sombre. Elle est aussi
 * légèrement inclinée, comme collée à la main.
 *
 * Les flèches sont rendues à part, à la hauteur de repos du poste, pour qu'elles
 * ne suivent pas le vêtement quand on le déplace.
 */
export function GarmentLayer({
  pieces,
  index,
  slot,
  canvas,
  layout,
  onIndexChange,
  onLayoutChange,
  showArrows = false,
  interactive = true,
  locked = false,
  onToggleLock,
}: GarmentLayerProps) {
  const { colors, radius } = useTheme();

  const piece = pieces[index] ?? null;
  // Un poste vide (index hors liste) peut recevoir la seule pièce disponible.
  const canCycle = pieces.length > (piece ? 1 : 0);

  const rect = bandRect(slot, canvas);
  const anchor = OUTFIT_SLOTS[slot]?.anchor ?? 'center';
  const tilt = piece ? tiltFor(piece.id, OUTFIT_SLOTS[slot]?.tilt ?? 1) : 0;

  // Liseré proportionnel à la toile : fin sur une vignette, plus marqué en grand.
  const outline = Math.max(1.5, Math.min(3, canvas.width * 0.008));
  const outlineDirections = canvas.width > 250 ? OUTLINE_DIRECTIONS : OUTLINE_DIRECTIONS.slice(0, 4);

  const ratio = useAspectRatio(piece?.uri ?? null);
  const geometry = useMemo(
    () => (ratio ? fitInBand(bandRect(slot, canvas), ratio, tilt, outline, anchor) : null),
    // `canvas` est recréé à chaque rendu par les appelants : on suit ses dimensions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ratio, slot, canvas.width, canvas.height, tilt, outline, anchor]
  );

  const scale = useAnimatedValue(layout.scale);
  const translateX = useAnimatedValue(layout.offsetX * canvas.width);
  const translateY = useAnimatedValue(layout.offsetY * canvas.height);
  /** Translation propre à l'animation de changement de vêtement. */
  const slideX = useAnimatedValue(0);

  const live = useRef<PieceLayout>(layout);
  const start = useRef<PieceLayout>(layout);
  const animating = useRef(false);

  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;

  /** Cadrage ramené dans l'encart, dès que la géométrie est connue. */
  const contain = useCallback((next: PieceLayout): PieceLayout => {
    const current = geometryRef.current;
    return current ? containLayout(next, current, canvasRef.current) : next;
  }, []);

  const commit = useRef(() => {});
  commit.current = () => {
    if (piece) onLayoutChange?.(piece, live.current);
  };

  // Le cadrage change de l'extérieur (autre vêtement, autre tenue, mesure de la
  // toile) : les valeurs animées doivent s'y recaler.
  // Un cadrage enregistré avant les encarts peut en déborder : il est ramené dedans.
  useEffect(() => {
    const contained = contain(layout);
    live.current = contained;
    scale.setValue(contained.scale);
    translateX.setValue(contained.offsetX * canvas.width);
    translateY.setValue(contained.offsetY * canvas.height);
  }, [layout, geometry, canvas.width, canvas.height, contain, scale, translateX, translateY]);

  const gesture = useMemo(() => {
    const drag = Gesture.Pan()
      .minDistance(MIN_DRAG)
      // `runOnJS` : les rappels tournent sur le fil JS, ce qui autorise
      // `setValue` sur une valeur animée classique, sans passer par Reanimated.
      .runOnJS(true)
      .onBegin(() => {
        start.current = live.current;
      })
      .onUpdate((event) => {
        const { width, height } = canvasRef.current;
        if (width === 0 || height === 0) return;

        const next = contain(
          clampLayout({
            ...live.current,
            offsetX: start.current.offsetX + event.translationX / width,
            offsetY: start.current.offsetY + event.translationY / height,
          })
        );

        live.current = next;
        translateX.setValue(next.offsetX * width);
        translateY.setValue(next.offsetY * height);
      })
      .onFinalize(() => commit.current());

    const zoom = Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => {
        start.current = live.current;
      })
      .onUpdate((event) => {
        // Réduire peut libérer de la place, agrandir en reprend : le décalage
        // est reborné à chaque pas pour que le calque reste dans l'encart.
        const next = contain(
          clampLayout({
            ...live.current,
            scale: start.current.scale * event.scale,
          })
        );

        const { width, height } = canvasRef.current;
        live.current = next;
        scale.setValue(next.scale);
        translateX.setValue(next.offsetX * width);
        translateY.setValue(next.offsetY * height);
      })
      .onFinalize(() => commit.current());

    return Gesture.Simultaneous(drag, zoom);
  }, [contain, scale, translateX, translateY]);

  /** Fait sortir le vêtement par un bord, change d'index, fait entrer le suivant. */
  const step = useCallback(
    (direction: -1 | 1) => {
      if (!canCycle || animating.current || !onIndexChange) return;
      animating.current = true;

      Animated.timing(slideX, {
        toValue: -direction * canvasRef.current.width,
        duration: SLIDE_OUT,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        onIndexChange((index + direction + pieces.length) % pieces.length);
        slideX.setValue(direction * canvasRef.current.width);

        Animated.timing(slideX, {
          toValue: 0,
          duration: SLIDE_IN,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          animating.current = false;
        });
      });
    },
    [canCycle, index, onIndexChange, pieces.length, slideX]
  );

  const body =
    piece && geometry ? (
      <Animated.View
        collapsable={false}
        style={[
          styles.layer,
          {
            ...geometry.box,
            transformOrigin: `50% ${geometry.originY * 100}%`,
            transform: [{ translateX }, { translateY }, { translateX: slideX }, { scale }],
          },
        ]}
      >
        {/* L'inclinaison tourne l'image autour de son centre, à l'intérieur du
            calque dimensionné pour la contenir. */}
        <View style={[styles.sticker, { ...geometry.photo, transform: [{ rotate: `${tilt}deg` }] }]}>
        {/* Ombre portée : une copie noire décalée vers le bas, sans flou. */}
        <Image
          source={{ uri: piece.uri }}
          resizeMode="contain"
          style={[
            styles.copy,
            styles.shadow,
            { transform: [{ translateY: outline * 2 }] },
          ]}
        />
        {/* Liseré : des copies blanches décalées tout autour de la pièce. */}
        {outlineDirections.map(([dx, dy]) => (
          <Image
            key={`${dx},${dy}`}
            source={{ uri: piece.uri }}
            resizeMode="contain"
            style={[
              styles.copy,
              styles.outline,
              { transform: [{ translateX: dx * outline }, { translateY: dy * outline }] },
            ]}
          />
        ))}
        <Image source={{ uri: piece.uri }} style={styles.photo} resizeMode="contain" />
        </View>
      </Animated.View>
    ) : null;

  return (
    <>
      {/* L'encart découpe : rien ne dépasse, pas même pendant l'animation des flèches. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.clip,
          { left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderRadius: radius.md },
        ]}
      >
        {body && interactive ? <GestureDetector gesture={gesture}>{body}</GestureDetector> : body}
      </View>

      {showArrows && canCycle && (
        // Hors du calque : elles restent en place quand on déplace le vêtement.
        <Animated.View
          pointerEvents="box-none"
          style={[styles.arrowRow, { top: rect.y, height: rect.height }]}
        >
          <View style={styles.arrowGroup}>
            <Arrow side="left" onPress={() => step(-1)} radius={radius.full} colors={colors} />
            {onToggleLock && (
              <LockButton
                locked={locked}
                onPress={onToggleLock}
                radius={radius.full}
                colors={colors}
              />
            )}
          </View>
          <Arrow side="right" onPress={() => step(1)} radius={radius.full} colors={colors} />
        </Animated.View>
      )}
    </>
  );
}

type LockButtonProps = {
  locked: boolean;
  onPress: () => void;
  radius: number;
  colors: { surface: string; primary: string; onPrimary: string; textMuted: string };
};

/** Cadenas dessiné en vues (anse + corps) : l'app n'embarque pas de jeu d'icônes. */
function LockButton({ locked, onPress, radius, colors }: LockButtonProps) {
  const ink = locked ? colors.onPrimary : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: locked }}
      accessibilityLabel={locked ? 'Libérer ce vêtement' : 'Garder ce vêtement au tirage'}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.lock,
        {
          backgroundColor: locked ? colors.primary : colors.surface,
          borderRadius: radius,
          opacity: pressed ? 0.6 : 0.92,
        },
      ]}
    >
      <View
        style={[
          styles.shackle,
          { borderColor: ink },
          // Ouvert : l'anse se soulève et se décale vers la droite.
          !locked && { transform: [{ translateY: -2 }, { translateX: 2 }] },
        ]}
      />
      <View style={[styles.lockBody, { backgroundColor: ink }]} />
    </Pressable>
  );
}

type ArrowProps = {
  side: 'left' | 'right';
  onPress: () => void;
  radius: number;
  colors: { surface: string; primary: string };
};

function Arrow({ side, onPress, radius, colors }: ArrowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={side === 'left' ? 'Vêtement précédent' : 'Vêtement suivant'}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.arrow,
        side === 'left' ? styles.arrowLeft : styles.arrowRight,
        {
          backgroundColor: colors.surface,
          borderRadius: radius,
          opacity: pressed ? 0.6 : 0.92,
        },
      ]}
    >
      <Text style={[styles.arrowGlyph, { color: colors.primary }]}>
        {side === 'left' ? '‹' : '›'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', overflow: 'hidden' },
  layer: { position: 'absolute' },
  sticker: { position: 'absolute' },
  photo: { width: '100%', height: '100%' },
  copy: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  outline: { tintColor: '#FFFFFF' },
  shadow: { tintColor: '#000000', opacity: 0.28 },
  arrowGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lock: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shackle: {
    width: 9,
    height: 7,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    marginBottom: -1,
  },
  lockBody: { width: 13, height: 9, borderRadius: 2 },
  arrowRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { marginLeft: 0 },
  arrowRight: { marginRight: 0 },
  arrowGlyph: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '600',
  },
});
