import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Confetti, GarmentLayer, Screen, SeasonPills, SlotBands } from '@/components';
import type { SeasonFilter } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import {
  DuplicateOutfitError,
  addOutfit,
  listPieces,
  setOutfitSlotLayout,
  setPieceLayout,
} from '@/services';
import type { Piece, PieceLayout } from '@/services';
import { OUTFIT_SLOTS, familyForCategory } from '@/types';
import type { OutfitSlot } from '@/types';

type Selection = Record<OutfitSlot, number>;
type Offset = { x: number; y: number };

const NO_OFFSET: Offset = { x: 0, y: 0 };
const NO_OFFSETS: Record<OutfitSlot, Offset> = {
  top: NO_OFFSET,
  bottom: NO_OFFSET,
  shoes: NO_OFFSET,
};

export default function OutfitComposerScreen() {
  const { spacing } = useTheme();
  const router = useRouter();

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [index, setIndex] = useState<Selection>({ top: 0, bottom: 0, shoes: 0 });
  /**
   * Position de chaque vêtement dans **cette** composition.
   *
   * Elle est locale et non enregistrée sur la pièce : changer de vêtement la
   * remet à zéro, et elle n'est écrite qu'au moment d'enregistrer la tenue, comme
   * cadrage propre à celle-ci. L'échelle, elle, reste un réglage du vêtement —
   * c'est une correction de la photo, pas un choix de composition.
   */
  const [offsets, setOffsets] = useState<Record<OutfitSlot, Offset>>(NO_OFFSETS);
  /** Postes épargnés par le tirage au sort. */
  const [locked, setLocked] = useState<Record<OutfitSlot, boolean>>({
    top: false,
    bottom: false,
    shoes: false,
  });
  const [season, setSeason] = useState<SeasonFilter>('all');
  /** La tenue est déjà écrite ; on laisse les confettis finir avant de revenir. */
  const [celebrating, setCelebrating] = useState(false);
  /** Toile partagée par les trois vêtements, mesurée au rendu. */
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setPieces(listPieces());
  }, []);

  /** Les pièces disponibles pour chaque poste, regroupées par famille. */
  const bySlot = useMemo(() => {
    const groups = { top: [], bottom: [], shoes: [] } as Record<OutfitSlot, Piece[]>;

    for (const piece of pieces) {
      const family = familyForCategory(piece.category);
      if (family === 'top' || family === 'bottom' || family === 'shoes') {
        groups[family].push(piece);
      }
    }

    return groups;
  }, [pieces]);

  const selectedFor = useCallback(
    (slot: OutfitSlot): Piece | null => bySlot[slot][index[slot]] ?? null,
    [bySlot, index]
  );

  const layoutFor = useCallback(
    (slot: OutfitSlot): PieceLayout => ({
      scale: selectedFor(slot)?.layout.scale ?? 1,
      offsetX: offsets[slot].x,
      offsetY: offsets[slot].y,
    }),
    [offsets, selectedFor]
  );

  /** Changer de vêtement repart d'une position neutre : on recompose de zéro. */
  const cycle = useCallback((slot: OutfitSlot, next: number) => {
    setIndex((current) => ({ ...current, [slot]: next }));
    setOffsets((current) => ({ ...current, [slot]: NO_OFFSET }));
  }, []);

  /**
   * Tire une nouvelle pièce pour chaque poste non verrouillé. Jamais la même que
   * l'actuelle : un tirage qui ne change rien ressemblerait à un bouton cassé.
   */
  const shuffle = useCallback(() => {
    for (const slot of OUTFIT_SLOTS) {
      const options = bySlot[slot.key];
      if (locked[slot.key] || options.length < 2) continue;

      let next = Math.floor(Math.random() * (options.length - 1));
      if (next >= index[slot.key]) next += 1;
      cycle(slot.key, next);
    }
  }, [bySlot, cycle, index, locked]);

  const canShuffle = OUTFIT_SLOTS.some(
    (slot) => !locked[slot.key] && bySlot[slot.key].length > 1
  );

  const adjust = useCallback((slot: OutfitSlot, piece: Piece, layout: PieceLayout) => {
    setOffsets((current) => ({
      ...current,
      [slot]: { x: layout.offsetX, y: layout.offsetY },
    }));

    // Seule l'échelle est retenue sur la pièce : elle corrige un cadrage de
    // photo, et vaut donc pour toutes les tenues.
    if (layout.scale !== piece.layout.scale) {
      setPieceLayout(piece.id, { ...piece.layout, scale: layout.scale });
      setPieces(listPieces());
    }
  }, []);

  const canSave = OUTFIT_SLOTS.some((slot) => selectedFor(slot.key) !== null);

  const save = useCallback(() => {
    try {
      const outfit = addOutfit({
        top: selectedFor('top')?.id ?? null,
        bottom: selectedFor('bottom')?.id ?? null,
        shoes: selectedFor('shoes')?.id ?? null,
        season: season === 'all' ? null : season,
      });

      // La composition est enregistrée sur la tenue, poste par poste.
      for (const slot of OUTFIT_SLOTS) {
        if (selectedFor(slot.key)) {
          setOutfitSlotLayout(outfit.id, slot.key, layoutFor(slot.key));
        }
      }

      setCelebrating(true);
    } catch (error) {
      if (error instanceof DuplicateOutfitError) {
        Alert.alert(
          'Tenue déjà enregistrée',
          'Cette combinaison existe déjà dans ta garde-robe! Change au moins un vêtement.'
        );
        return;
      }

      Alert.alert('Enregistrement impossible', String(error));
    }
  }, [layoutFor, season, selectedFor]);

  return (
    <Screen>
      <SeasonPills selected={season} onSelect={setSeason} />

      {/*
        Une seule toile pour les trois vêtements : aucune boîte par poste, aucune
        découpe. Le rang du poste ne donne qu'une position de repos ; chaque
        vêtement se déplace ensuite librement et peut chevaucher ses voisins.
      */}
      <View
        style={styles.canvas}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setCanvas({ width, height });
        }}
      >
        {canvas.width > 0 && <SlotBands canvas={canvas} />}
        {canvas.width > 0 &&
          OUTFIT_SLOTS.map((slot, rank) => (
            <GarmentLayer
              key={slot.key}
              pieces={bySlot[slot.key]}
              index={index[slot.key]}
              slot={rank}
              canvas={canvas}
              layout={layoutFor(slot.key)}
              onIndexChange={(next) => cycle(slot.key, next)}
              onLayoutChange={(piece, layout) => adjust(slot.key, piece, layout)}
              showArrows
              locked={locked[slot.key]}
              onToggleLock={() =>
                setLocked((current) => ({ ...current, [slot.key]: !current[slot.key] }))
              }
            />
          ))}
      </View>

      <View style={[styles.actions, { gap: spacing.sm, paddingTop: spacing.sm }]}>
        <DiceButton onPress={shuffle} disabled={!canShuffle || celebrating} />
        <Button
          label={celebrating ? 'Enregistrée !' : 'Enregistrer la tenue'}
          disabled={!canSave || celebrating}
          onPress={save}
          style={styles.save}
        />
      </View>

      {celebrating && <Confetti onDone={() => router.back()} />}
    </Screen>
  );
}

/** Positions des points d'une face de dé à cinq, en fraction du carré. */
const DICE_DOTS = [
  [0.27, 0.27],
  [0.73, 0.27],
  [0.5, 0.5],
  [0.27, 0.73],
  [0.73, 0.73],
];
const DICE_SIZE = 24;
const DOT_SIZE = 4;

/** Bouton « tirer une tenue au hasard », dessiné en vues comme le cadenas. */
function DiceButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tirer une tenue au hasard"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dice,
        {
          borderColor: colors.primary,
          borderRadius: radius.full,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }, { rotate: pressed ? '-12deg' : '0deg' }],
        },
      ]}
    >
      <View style={[styles.diceFace, { borderColor: colors.primary }]}>
        {DICE_DOTS.map(([x, y]) => (
          <View
            key={`${x},${y}`}
            style={[
              styles.diceDot,
              {
                backgroundColor: colors.primary,
                left: x * DICE_SIZE - DOT_SIZE / 2 - 2,
                top: y * DICE_SIZE - DOT_SIZE / 2 - 2,
              },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'stretch' },
  save: { flex: 1 },
  dice: {
    width: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceFace: {
    width: DICE_SIZE,
    height: DICE_SIZE,
    borderWidth: 2,
    borderRadius: 7,
  },
  diceDot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
