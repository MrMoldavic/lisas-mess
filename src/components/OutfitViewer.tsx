import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import type { Outfit, Piece } from '@/services';
import { colorNameForSeason, findSeason } from '@/types';

type OutfitViewerProps = {
  /** `null` ferme la vue. */
  outfit: Outfit | null;
  /** Les pièces de la garde-robe, indexées par identifiant. */
  pieces: Map<string, Piece>;
  onToggleFavorite: (outfit: Outfit) => void;
  onDelete: (outfit: Outfit) => void;
  onClose: () => void;
};

/** Une tenue en grand : les trois vêtements occupent toute la hauteur utile. */
export function OutfitViewer({
  outfit,
  pieces,
  onToggleFavorite,
  onDelete,
  onClose,
}: OutfitViewerProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  if (!outfit) return null;

  const season = findSeason(outfit.season);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <Text style={[styles.close, { color: colors.textMuted }]}>✕</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: outfit.favorite }}
            accessibilityLabel={outfit.favorite ? 'Retirer des favoris' : 'Mettre en favori'}
            hitSlop={12}
            onPress={() => onToggleFavorite(outfit)}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <Text
              style={[
                styles.star,
                { color: outfit.favorite ? colors.primary : colors.textMuted },
              ]}
            >
              {outfit.favorite ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        {/* Même empilement que sur la carte, sans séparation ni écart. */}
        <View style={styles.silhouette}>
          {([outfit.top, outfit.bottom, outfit.shoes] as const).map((pieceId, rank) => {
            const piece = pieceId ? pieces.get(pieceId) : undefined;

            return (
              <View key={rank} style={styles.part}>
                {piece ? (
                  <Image
                    source={{ uri: piece.uri }}
                    style={[styles.photo, { transform: [{ scale: piece.scale }] }]}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={[styles.footer, { gap: spacing.md }]}>
          {season && (
            <View
              style={[
                styles.season,
                {
                  backgroundColor: colors[colorNameForSeason(season.id)],
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text style={[styles.seasonLabel, { color: colors.onPrimary }]}>
                {season.label}
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => onDelete(outfit)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <Text style={[typography.body, styles.delete, { color: colors.danger }]}>
              Supprimer la tenue
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { fontSize: 24, fontWeight: '500' },
  star: { fontSize: 28, lineHeight: 32 },
  silhouette: { flex: 1 },
  part: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  footer: { alignItems: 'center' },
  season: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  seasonLabel: { fontSize: 13, fontWeight: '700' },
  delete: { fontWeight: '600' },
});
