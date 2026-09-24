import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Button,
  CategoryPills,
  CategorySheet,
  ModeSwitch,
  OutfitViewer,
  Screen,
  SeasonPills,
} from '@/components';
import type { CategoryFilter, Mode, SeasonFilter } from '@/components';
import { useTheme } from '@/hooks/useTheme';
import {
  addPiece,
  addPieceFromUrl,
  forgetPiece,
  isCutoutConfigured,
  listOutfits,
  listPieces,
  removeBackground,
  removeOutfit,
  removePiece,
  setPieceCategory,
  toggleOutfitFavorite,
} from '@/services';
import type { Outfit, Piece } from '@/services';
import { colorNameForCategory, colorNameForSeason, findCategory, findSeason } from '@/types';
import type { CategoryId } from '@/types';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.85,
};

type Status = null | 'saving' | 'cutout';

/**
 * Quatre cartes visibles d'un coup — la carte « + » plus trois tenues — donc
 * deux colonnes sur deux rangées. Chaque carte occupe ainsi le quart de la place
 * restante sous le titre, écarts déduits.
 */
const OUTFIT_COLUMNS = 2;
const OUTFIT_ROWS = 2;
const OUTFIT_GAP = 12;

export default function PiecesScreen() {
  const { colors, radius, spacing, typography } = useTheme();
  /** Place réellement disponible pour les tenues, mesurée au rendu. */
  const [outfitArea, setOutfitArea] = useState({ width: 0, height: 0 });
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  /** Tenue affichée en grand, `null` si la vue est fermée. */
  const [viewing, setViewing] = useState<Outfit | null>(null);
  const [mode, setMode] = useState<Mode>('pieces');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('all');
  const [status, setStatus] = useState<Status>(null);
  /** Pièce dont on est en train de choisir la catégorie. */
  const [editing, setEditing] = useState<Piece | null>(null);

  const router = useRouter();

  useEffect(() => {
    setPieces(listPieces());
  }, []);

  /** Relu à chaque retour sur l'écran, notamment après la création d'une tenue. */
  useFocusEffect(
    useCallback(() => {
      setOutfits(listOutfits());
    }, [])
  );

  const pieceById = useMemo(
    () => new Map(pieces.map((piece) => [piece.id, piece])),
    [pieces]
  );

  const visibleOutfits = useMemo(
    () =>
      seasonFilter === 'all'
        ? outfits
        : outfits.filter((outfit) => outfit.season === seasonFilter),
    [outfits, seasonFilter]
  );

  const toggleFavorite = useCallback((outfit: Outfit) => {
    toggleOutfitFavorite(outfit.id);
    const refreshed = listOutfits();
    setOutfits(refreshed);
    // La vue agrandie tient sa propre copie : sans ça, l'étoile qu'on vient d'y
    // toucher garderait son ancien état jusqu'à la fermeture.
    setViewing((current) =>
      current ? refreshed.find((outfit) => outfit.id === current.id) ?? null : null
    );
  }, []);

  const confirmRemoveOutfit = useCallback((outfit: Outfit) => {
    Alert.alert('Supprimer cette tenue ?', 'Les pièces qui la composent sont conservées.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          removeOutfit(outfit.id);
          setOutfits(listOutfits());
          setViewing(null);
        },
      },
    ]);
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
          // Sans ça, les tenues garderaient une référence vers une photo effacée.
          forgetPiece(piece.id);
          setPieces(listPieces());
          setOutfits(listOutfits());
        },
      },
    ]);
  }, []);

  const busy = status !== null;
  const selectedCategory = findCategory(categoryForNewPiece);

  const outfitCardWidth =
    (outfitArea.width - OUTFIT_GAP * (OUTFIT_COLUMNS - 1)) / OUTFIT_COLUMNS;
  const outfitCardHeight =
    (outfitArea.height - OUTFIT_GAP * OUTFIT_ROWS) / OUTFIT_ROWS;

  if (mode === 'outfits') {
    const season = findSeason(seasonFilter === 'all' ? null : seasonFilter);

    return (
      <Screen>
        <ModeSwitch selected={mode} onSelect={setMode} />

        <View style={{ paddingTop: spacing.sm }}>
          <SeasonPills selected={seasonFilter} onSelect={setSeasonFilter} />
        </View>

        <View style={{ gap: spacing.xs, paddingTop: spacing.md }}>
          <Text style={[typography.title, { color: colors.text }]}>
            {visibleOutfits.length === 0
              ? season
                ? `Aucune tenue ${season.inPhrase}`
                : 'Aucune tenue'
              : `${visibleOutfits.length} tenue${visibleOutfits.length > 1 ? 's' : ''}`}
          </Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            {visibleOutfits.length === 0
              ? 'Un haut, un bas et une paire de chaussures.'
              : 'Appuie sur une tenue pour la voir en grand.'}
          </Text>
        </View>

        {/*
          La place est mesurée ici plutôt que déduite de la taille de l'écran :
          l'en-tête de navigation, le sélecteur, les pilules et le titre en
          consomment une part qu'aucune constante ne peut suivre sans se
          désynchroniser.
        */}
        <View
          style={styles.outfitArea}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setOutfitArea({ width, height });
          }}
        >
          {outfitArea.width > 0 && (
            <ScrollView contentContainerStyle={{ paddingVertical: spacing.md }}>
              <View style={[styles.outfitGrid, { gap: OUTFIT_GAP }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Créer une tenue"
                  onPress={() => router.push('/tenue')}
                  style={({ pressed }) => [
                    styles.outfitCard,
                    {
                      width: outfitCardWidth,
                      height: outfitCardHeight,
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.outfitPlus, { color: colors.primary }]}>+</Text>
                </Pressable>

                {visibleOutfits.map((outfit) => (
                  <Pressable
                    key={outfit.id}
                    accessibilityRole="button"
                    accessibilityLabel="Voir cette tenue"
                    onPress={() => setViewing(outfit)}
                    style={({ pressed }) => [
                      styles.outfitSaved,
                      {
                        width: outfitCardWidth,
                        height: outfitCardHeight,
                        backgroundColor: colors.surfaceAlt,
                        borderRadius: radius.md,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    {([outfit.top, outfit.bottom, outfit.shoes] as const).map((pieceId, rank) => {
                      const piece = pieceId ? pieceById.get(pieceId) : undefined;

                      return (
                        <View key={rank} style={styles.outfitPart}>
                          {piece ? (
                            <Image
                              source={{ uri: piece.uri }}
                              style={[
                                styles.outfitPartPhoto,
                                { transform: [{ scale: piece.scale }] },
                              ]}
                              resizeMode="contain"
                            />
                          ) : null}
                        </View>
                      );
                    })}

                    {/*
                      Badge posé seulement si la tenue porte une saison : une
                      tenue sans saison vaut pour toutes, et un badge « Toute
                      saison » sur chaque carte encombrerait la grille pour ne
                      rien dire.
                    */}
                    {outfit.season && (
                      <View
                        style={[
                          styles.outfitSeason,
                          {
                            backgroundColor: colors[colorNameForSeason(outfit.season)],
                            borderRadius: radius.full,
                          },
                        ]}
                      >
                        <Text style={[styles.outfitSeasonLabel, { color: colors.onPrimary }]}>
                          {findSeason(outfit.season)?.label}
                        </Text>
                      </View>
                    )}

                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: outfit.favorite }}
                      accessibilityLabel={
                        outfit.favorite ? 'Retirer des favoris' : 'Mettre en favori'
                      }
                      // hitSlop élargit la zone tactile sans agrandir l'étoile,
                      // qui reste petite sur une carte de 175 points.
                      hitSlop={10}
                      onPress={() => toggleFavorite(outfit)}
                      style={({ pressed }) => [
                        styles.outfitStar,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.outfitStarGlyph,
                          { color: outfit.favorite ? colors.primary : colors.textMuted },
                        ]}
                      >
                        {outfit.favorite ? '★' : '☆'}
                      </Text>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <OutfitViewer
          outfit={viewing}
          pieces={pieceById}
          onToggleFavorite={toggleFavorite}
          onDelete={confirmRemoveOutfit}
          onClose={() => setViewing(null)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ModeSwitch selected={mode} onSelect={setMode} />

      <View style={{ paddingTop: spacing.sm }}>
        <CategoryPills selected={filter} onSelect={setFilter} showUnclassified={hasUnclassified} />
      </View>

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
  outfitArea: { flex: 1 },
  outfitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  outfitCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  outfitSaved: {
    overflow: 'hidden',
    padding: 6,
  },
  /** Les trois postes se partagent la hauteur de la carte, de haut en bas. */
  outfitPart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitPartPhoto: { width: '100%', height: '100%' },
  outfitSeason: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  outfitSeasonLabel: { fontSize: 10, fontWeight: '700' },
  outfitStar: {
    position: 'absolute',
    top: 4,
    right: 6,
  },
  outfitStarGlyph: {
    fontSize: 22,
    lineHeight: 26,
  },
  outfitPlus: {
    fontSize: 48,
    fontWeight: '300',
    // `lineHeight` égal à la taille recentre le glyphe, qui traîne beaucoup
    // d'espace sous lui dans sa police et tirait le « + » vers le haut.
    lineHeight: 48,
  },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
