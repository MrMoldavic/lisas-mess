import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Confetti, GarmentSlider, Screen, SeasonPills } from '@/components';
import type { SeasonFilter } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import { DuplicateOutfitError, addOutfit, listPieces, setPieceScale } from '@/services';
import type { Piece } from '@/services';
import { OUTFIT_SLOTS, familyForCategory } from '@/types';
import type { OutfitSlot } from '@/types';

type Selection = Record<OutfitSlot, number>;

export default function OutfitComposerScreen() {
  const { spacing } = useTheme();
  const router = useRouter();

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [index, setIndex] = useState<Selection>({ top: 0, bottom: 0, shoes: 0 });
  const [season, setSeason] = useState<SeasonFilter>('all');
  /** La tenue est déjà écrite ; on laisse les confettis finir avant de revenir. */
  const [celebrating, setCelebrating] = useState(false);

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

  /**
   * Enregistre le cadrage ajusté au pincement. La liste est relue pour que la
   * nouvelle échelle reparte de la source et s'applique aussi ailleurs dans l'app.
   */
  const adjustScale = useCallback((piece: Piece, scale: number) => {
    setPieceScale(piece.id, scale);
    setPieces(listPieces());
  }, []);

  const canSave = OUTFIT_SLOTS.some((slot) => selectedFor(slot.key) !== null);

  const save = useCallback(() => {
    try {
      addOutfit({
        top: selectedFor('top')?.id ?? null,
        bottom: selectedFor('bottom')?.id ?? null,
        shoes: selectedFor('shoes')?.id ?? null,
        season: season === 'all' ? null : season,
      });

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
  }, [season, selectedFor]);

  return (
    <Screen>
      <SeasonPills selected={season} onSelect={setSeason} />

      {/*
        Aucune séparation entre les postes : les trois vêtements s'empilent en
        silhouette continue, comme portés. Chacun se partage la hauteur à parts
        égales.
      */}
      <View style={styles.silhouette}>
        {OUTFIT_SLOTS.map((slot) => (
          <GarmentSlider
            key={slot.key}
            pieces={bySlot[slot.key]}
            index={index[slot.key]}
            onIndexChange={(next) => setIndex((current) => ({ ...current, [slot.key]: next }))}
            onScaleChange={adjustScale}
            emptyLabel={`Aucun ${slot.label.toLowerCase()}`}
          />
        ))}
      </View>

      <View style={{ paddingTop: spacing.sm }}>
        <Button
          label={celebrating ? 'Enregistrée !' : 'Enregistrer la tenue'}
          disabled={!canSave || celebrating}
          onPress={save}
        />
      </View>

      {celebrating && <Confetti onDone={() => router.back()} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  silhouette: {
    flex: 1,
    // Pas de `gap` : l'absence d'écart est ce qui fait tenir la silhouette.
  },
});
