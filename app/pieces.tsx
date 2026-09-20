import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, CategoryPills, CategorySheet, Screen } from '@/components';
import type { CategoryFilter } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import {
  addPiece,
  addPieceFromUrl,
  isCutoutConfigured,
  listPieces,
  removeBackground,
  removePiece,
  setPieceCategory,
} from '@/services';
import type { Piece } from '@/services';
import { colorNameForCategory, findCategory } from '@/types';
import type { CategoryId } from '@/types';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.85,
};

type Status = null | 'saving' | 'cutout';

export default function PiecesScreen() {
  const { colors, radius, spacing, typography } = useTheme();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [status, setStatus] = useState<Status>(null);
  /** Pièce dont on est en train de choisir la catégorie. */
  const [editing, setEditing] = useState<Piece | null>(null);

  useEffect(() => {
    setPieces(listPieces());
  }, []);

  const hasUnclassified = useMemo(
    () => pieces.some((piece) => piece.category === null),
    [pieces]
  );

  const visible = useMemo(() => {
    if (filter === 'all') return pieces;
    if (filter === 'unclassified') return pieces.filter((piece) => piece.category === null);
    return pieces.filter((piece) => piece.category === filter);
  }, [pieces, filter]);

  /** La pilule sélectionnée classe la prochaine photo ; « Tout » la laisse à classer. */
  const categoryForNewPiece: CategoryId | null =
    filter === 'all' || filter === 'unclassified' ? null : filter;

  const importImage = useCallback(
    async (source: 'camera' | 'library') => {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Accès refusé',
          source === 'camera'
            ? "L'app a besoin de l'appareil photo pour ajouter une pièce."
            : "L'app a besoin d'accéder à tes photos pour importer une pièce."
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

      if (result.canceled) return;
      const sourceUri = result.assets[0].uri;

      try {
        if (isCutoutConfigured()) {
          setStatus('cutout');
          try {
            const cutoutUrl = await removeBackground(sourceUri);
            await addPieceFromUrl(cutoutUrl, categoryForNewPiece);
          } catch (error) {
            // Le détourage est un confort, pas une condition : on garde la photo brute.
            setStatus('saving');
            await addPiece(sourceUri, categoryForNewPiece);
            Alert.alert('Détourage impossible', `${error}\n\nLa photo a été gardée telle quelle.`);
          }
        } else {
          setStatus('saving');
          await addPiece(sourceUri, categoryForNewPiece);
        }

        setPieces(listPieces());
      } catch (error) {
        Alert.alert('Enregistrement impossible', String(error));
      } finally {
        setStatus(null);
      }
    },
    [categoryForNewPiece]
  );

  const classify = useCallback(
    (piece: Piece, category: CategoryId | null) => {
      try {
        setPieceCategory(piece.id, category);
        setPieces(listPieces());
      } catch (error) {
        Alert.alert('Classement impossible', String(error));
      } finally {
        setEditing(null);
      }
    },
    []
  );

  const confirmRemove = useCallback((piece: Piece) => {
    Alert.alert('Supprimer cette pièce ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          removePiece(piece.id);
          setPieces(listPieces());
        },
      },
    ]);
  }, []);

  const busy = status !== null;
  const selectedCategory = findCategory(categoryForNewPiece);

  return (
    <Screen>
      <CategoryPills selected={filter} onSelect={setFilter} showUnclassified={hasUnclassified} />

      <FlatList
        style={styles.list}
        data={visible}
        keyExtractor={(piece) => piece.id}
        numColumns={3}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}
        ListHeaderComponent={
          <View style={{ gap: spacing.xs, paddingTop: spacing.md }}>
            <Text style={[typography.title, { color: colors.text }]}>
              {visible.length === 0
                ? 'Aucune pièce'
                : `${visible.length} pièce${visible.length > 1 ? 's' : ''}`}
            </Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              {selectedCategory
                ? `La prochaine photo sera classée dans « ${selectedCategory.label} ».`
                : 'Appuie sur une pièce pour la classer, ou choisis une catégorie avant de photographier.'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.empty,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                borderRadius: radius.lg,
                gap: spacing.xs,
              },
            ]}
          >
            <Text style={styles.emptyEmoji}>📷</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              {filter === 'all'
                ? "Ta première pièce t'attend."
                : 'Rien dans cette catégorie pour le moment.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const category = findCategory(item.category);

          return (
            <Pressable
              onPress={() => setEditing(item)}
              onLongPress={() => confirmRemove(item)}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  padding: spacing.xs,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Image source={{ uri: item.uri }} style={styles.photo} resizeMode="contain" />
              {category && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors[colorNameForCategory(category.id)],
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.badgeLabel, { color: colors.onPrimary }]}
                  >
                    {category.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {busy && (
        <View style={[styles.busy, { gap: spacing.sm, paddingVertical: spacing.sm }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {status === 'cutout' ? 'Détourage en cours…' : 'Enregistrement…'}
          </Text>
        </View>
      )}

      <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
        <Button label="Prendre en photo" onPress={() => importImage('camera')} disabled={busy} />
        <Button
          label="Importer depuis mes photos"
          variant="secondary"
          onPress={() => importImage('library')}
          disabled={busy}
        />
      </View>

      <CategorySheet
        visible={editing !== null}
        current={editing?.category ?? null}
        onSelect={(category) => editing && classify(editing, category)}
        onDelete={() => {
          const piece = editing;
          setEditing(null);
          if (piece) confirmRemove(piece);
        }}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  tile: {
    flex: 1,
    aspectRatio: 1,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  badge: {
    // Tendu d'un bord à l'autre : sur une vignette d'environ 110 px, un badge
    // dimensionné par son texte déborderait sur « Chaussures » ou « Accessoire ».
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    paddingVertical: 3,
  },
  badgeLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 32 },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
