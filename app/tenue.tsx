import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  Button,
  Confetti,
  GarmentLayer,
  Relief,
  Screen,
  ChallengeBanner,
  SeasonPills,
  SlotBands,
} from '@/components';
import type { ChallengeState, SeasonFilter } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import {
  DuplicateOutfitError,
  addOutfit,
  challengeCheck,
  leftCount,
  isLeaving,
  listOutfits,
  listPieces,
  setOutfitSlotLayout,
  setPieceLayout,
  workshopStatus,
} from '@/services';
import type { Outfit, Piece, PieceLayout } from '@/services';
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
  /** Tenues existantes : le défi du jour se juge par rapport à elles. */
  const [outfits, setOutfits] = useState<Outfit[]>([]);
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
  /** La tenue enregistrée a relevé le défi du jour. */
  const [wonChallenge, setWonChallenge] = useState(false);
  /** Toile partagée par les trois vêtements, mesurée au rendu. */
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setPieces(listPieces());
    setOutfits(listOutfits());
  }, []);

  /** Les pièces disponibles pour chaque poste, regroupées par famille. */
  const bySlot = useMemo(() => {
    const groups = { top: [], bottom: [], shoes: [] } as Record<OutfitSlot, Piece[]>;

    for (const piece of pieces) {
      // Une pièce « À sortir » n'est plus proposée.
      if (isLeaving(piece)) continue;
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

  // `?surprise=1` (tiroir « Au hasard » de l'accueil) : un tirage dès que les
  // pièces sont chargées, une seule fois. `?challenge=1` (carte du défi) :
  // le défi du jour est rappelé en haut de l'écran.
  const { surprise, challenge: fromChallenge, piece: startPiece } = useLocalSearchParams<{
    surprise?: string;
    challenge?: string;
    /** Piece to start from (« + » of the piece view): put in its slot and locked against the dice. */
    piece?: string;
  }>();
  const started = useRef(false);
  useEffect(() => {
    if (!startPiece || started.current) return;
    for (const slot of OUTFIT_SLOTS) {
      const position = bySlot[slot.key].findIndex((piece) => piece.id === startPiece);
      if (position < 0) continue;
      started.current = true;
      cycle(slot.key, position);
      setLocked((current) => ({ ...current, [slot.key]: true }));
      return;
    }
  }, [bySlot, cycle, startPiece]);
  const surprised = useRef(false);
  useEffect(() => {
    if (surprise !== '1' || surprised.current || !canShuffle) return;
    surprised.current = true;
    shuffle();
  }, [canShuffle, shuffle, surprise]);

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

  const status = useMemo(() => workshopStatus(pieces, outfits, leftCount()), [pieces, outfits]);
  const check = useMemo(() => challengeCheck(pieces, outfits), [pieces, outfits]);

  /** Où en est la tenue en cours face au défi du jour, jugée en direct. */
  const challengeState: ChallengeState = status.challengeDone
    ? 'done'
    : check?.({
          top: selectedFor('top')?.id ?? null,
          bottom: selectedFor('bottom')?.id ?? null,
          shoes: selectedFor('shoes')?.id ?? null,
          season: season === 'all' ? null : season,
        })
      ? 'matched'
      : 'pending';

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

      setWonChallenge(challengeState === 'matched');
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
  }, [challengeState, layoutFor, season, selectedFor]);

  return (
    <Screen>
      <SeasonPills selected={season} onSelect={setSeason} />

      {/* Rappel du défi, quand on arrive depuis sa carte : la toile rétrécit d'autant. */}
      {fromChallenge === '1' && status.challenge && (
        <View style={{ paddingTop: spacing.sm }}>
          <ChallengeBanner
            label={status.challenge.label}
            reward={status.challenge.reward}
            state={challengeState}
          />
        </View>
      )}

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
          label={celebrating ? (wonChallenge ? 'Défi réussi !' : 'Créée !') : 'Créer la tenue'}
          icon={(ink) => <Ionicons name="sparkles" size={20} color={ink} />}
          disabled={!canSave || celebrating}
          onPress={save}
          style={styles.save}
        />
      </View>

      {celebrating && <Confetti onDone={() => router.back()} />}
    </Screen>
  );
}

/** Points d'une face de dé à cinq, en fraction du côté. */
const DIE_DOTS = [
  [0.26, 0.26],
  [0.74, 0.26],
  [0.5, 0.5],
  [0.26, 0.74],
  [0.74, 0.74],
];
const DIE = 30;
const DOT = 6;

/**
 * « Tirer une tenue au hasard » : une face de dé, légèrement penchée, sur un
 * bouton carré en relief canard. Un dé se comprend tout de suite, là où le
 * bouton de couture ne disait pas à quoi il servait.
 */
function DiceButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const { colors, radius } = useTheme();

  return (
    <Relief
      tone="secondary"
      onPress={onPress}
      disabled={disabled}
      borderRadius={radius.md}
      accessibilityLabel="Tirer une tenue au hasard"
      faceStyle={styles.dice}
    >
      {(ink) => (
        <View style={[styles.die, { backgroundColor: ink }]}>
          {DIE_DOTS.map(([x, y]) => (
            <View
              key={`${x},${y}`}
              style={[
                styles.dot,
                { backgroundColor: colors.secondaryDeep, left: x * DIE - DOT / 2, top: y * DIE - DOT / 2 },
              ]}
            />
          ))}
        </View>
      )}
    </Relief>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'stretch' },
  save: { flex: 1 },
  dice: { width: 58, height: 54 },
  die: { width: DIE, height: DIE, borderRadius: 8, transform: [{ rotate: '-10deg' }] },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
});
