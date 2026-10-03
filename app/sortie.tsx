import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button, Mascot, PieceSticker, Relief, Screen } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import {
  BUTTONS_PER_LEFT,
  isLeaving,
  leftCount,
  listPieces,
  removeForGood,
  setVerdict,
} from '@/services';
import type { Piece } from '@/services';
import { fonts } from '@/theme';
import { colorNameForCategory, findCategory } from '@/types';

/**
 * « À sortir » : les pièces triées, qui vont quitter la garde-robe (don, vente,
 * recyclage, peu importe). Pour chacune, on la supprime définitivement une fois
 * partie, ou on change d'avis et elle retourne dans les vêtements.
 */
export default function LeavingScreen() {
  const { colors, radius, spacing, typography } = useTheme();
  const router = useRouter();

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [left, setLeft] = useState(0);

  const reload = useCallback(() => {
    setPieces(listPieces().filter(isLeaving));
    setLeft(leftCount());
  }, []);

  useFocusEffect(reload);

  const keep = useCallback(
    (piece: Piece) => {
      // Elle retourne dans les vêtements, comme si on venait de la garder au tri.
      setVerdict(piece.id, 'keep');
      reload();
    },
    [reload]
  );

  const confirmRemove = useCallback(
    (piece: Piece) => {
      Alert.alert(
        'Supprimer définitivement ?',
        `La photo est effacée et la pièce quitte ses tenues. +${BUTTONS_PER_LEFT} bobinous dans ton bocal.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => {
              removeForGood(piece.id);
              reload();
            },
          },
        ]
      );
    },
    [reload]
  );

  const confirmRemoveAll = useCallback(() => {
    const count = pieces.length;
    Alert.alert(
      `Supprimer les ${count} pièces ?`,
      `Leurs photos sont effacées et elles quittent leurs tenues. +${count * BUTTONS_PER_LEFT} bobinous dans ton bocal.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => {
            for (const piece of pieces) removeForGood(piece.id);
            reload();
          },
        },
      ]
    );
  }, [pieces, reload]);

  const header = useMemo(
    () => (
      <View style={{ gap: spacing.xs, paddingBottom: spacing.md }}>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Les pièces que tu as triées. Supprime-les une fois parties de ta garde-robe, ou remets-les
          dans tes vêtements si tu changes d&apos;avis.
        </Text>
        {left > 0 && (
          <Text style={[typography.caption, { color: colors.secondaryDeep }]}>
            Déjà {left} pièce{left > 1 ? 's' : ''} sortie{left > 1 ? 's' : ''} de ta garde-robe.
          </Text>
        )}
      </View>
    ),
    [colors, left, spacing, typography]
  );

  if (pieces.length === 0) {
    return (
      <Screen>
        <View style={[styles.empty, { gap: spacing.md }]}>
          <Mascot size={80} />
          <Text style={[typography.title, { color: colors.text, textAlign: 'center' }]}>Rien à sortir</Text>
          <Text style={[typography.body, styles.emptyText, { color: colors.textMuted }]}>
            Pendant le tri, glisse une pièce vers la gauche (« Je trie ») pour la mettre ici.
            {left > 0 ? `\nDéjà ${left} pièce${left > 1 ? 's' : ''} sortie${left > 1 ? 's' : ''}.` : ''}
          </Text>
        </View>
        <Button
          label="Commencer le tri"
          variant="wood"
          icon={(ink) => <Ionicons name="swap-horizontal" size={20} color={ink} />}
          onPress={() => router.replace('/tri')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={pieces}
        keyExtractor={(piece) => piece.id}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }}
        renderItem={({ item }) => {
          const category = findCategory(item.category);

          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.surfaceDeep,
                  borderRadius: radius.lg,
                  padding: spacing.sm,
                  gap: spacing.sm,
                },
              ]}
            >
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors[colorNameForCategory(item.category)], borderRadius: radius.full },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.onPrimary }]}>{category?.label ?? 'À classer'}</Text>
              </View>

              <PieceSticker uri={item.thumbUri} outline={2} style={styles.photo} />

              <View style={[styles.actions, { gap: spacing.sm }]}>
                <Relief
                  tone="secondary"
                  onPress={() => keep(item)}
                  borderRadius={radius.md}
                  accessibilityLabel="Je la garde"
                  style={styles.action}
                  faceStyle={styles.actionFace}
                >
                  {(ink) => (
                    <>
                      <Ionicons name="arrow-undo" size={16} color={ink} />
                      <Text style={[styles.actionText, { color: ink }]}>Garder</Text>
                    </>
                  )}
                </Relief>
                <Relief
                  tone="surface"
                  onPress={() => confirmRemove(item)}
                  borderRadius={radius.md}
                  accessibilityLabel="Supprimer définitivement"
                  faceStyle={styles.trashFace}
                >
                  {() => <Ionicons name="trash" size={18} color={colors.danger} />}
                </Relief>
              </View>
            </View>
          );
        }}
      />

      <Button
        label={`Tout supprimer · ${pieces.length}`}
        icon={(ink) => <Ionicons name="trash" size={20} color={ink} />}
        onPress={confirmRemoveAll}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, maxWidth: '48.5%', borderBottomWidth: 4 },
  chip: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontFamily: fonts.heading, fontSize: 12 },
  photo: { aspectRatio: 1, width: '100%' },
  actions: { flexDirection: 'row' },
  action: { flex: 1 },
  actionFace: { gap: 5, paddingVertical: 9 },
  actionText: { fontFamily: fonts.heading, fontSize: 13 },
  trashFace: { width: 42, paddingVertical: 9 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', maxWidth: 300 },
});
