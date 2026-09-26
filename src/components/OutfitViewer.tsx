import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { fonts } from '@/theme';
import { DEFAULT_LAYOUT, isInCrate } from '@/services';
import type { Outfit, Piece } from '@/services';
import { OUTFIT_SLOTS, colorNameForSeason, familyForCategory, findSeason } from '@/types';
import type { OutfitSlot, SeasonId } from '@/types';

import { GarmentLayer } from './GarmentLayer';
import { Relief } from './Button';
import { SlotBands } from './SlotBands';

type Selection = Record<OutfitSlot, string | null>;
type IconName = ComponentProps<typeof Ionicons>['name'];

type OutfitViewerProps = {
  /** `null` ferme la vue. */
  outfit: Outfit | null;
  /** Les pièces de la garde-robe, indexées par identifiant. */
  pieces: Map<string, Piece>;
  onToggleFavorite: (outfit: Outfit) => void;
  /** Enregistre les vêtements choisis en mode modification ; `false` garde le mode ouvert. */
  onChangePieces: (outfit: Outfit, selection: Selection) => boolean;
  /** Oublie le cadrage propre à la tenue : elle repart des défauts des pièces. */
  onResetFraming: (outfit: Outfit) => void;
  onDelete: (outfit: Outfit) => void;
  onClose: () => void;
};

const SEASON_ICONS: Record<SeasonId, IconName> = {
  spring: 'flower',
  summer: 'sunny',
  autumn: 'leaf',
  winter: 'snow',
};

/** Suffixe d'opacité hexadécimal (~15 %) pour teinter un fond avec une couleur de la palette. */
const TINT = '26';

function selectionOf(outfit: Outfit): Selection {
  return { top: outfit.top, bottom: outfit.bottom, shoes: outfit.shoes };
}

/**
 * Une tenue en grand : les trois vêtements occupent toute la hauteur utile.
 *
 * L'affichage est **fixe** : aucun geste, la tenue est montrée telle qu'elle a
 * été composée. Le bouton « Modifier » fait apparaître des flèches par poste,
 * comme dans le composeur, pour changer de vêtement.
 *
 * Les commandes sont des bulles rondes : fermer et favori en haut, de part et
 * d'autre de la saison ; les actions sur la tenue dans un dock en bas.
 */
export function OutfitViewer({
  outfit,
  pieces,
  onToggleFavorite,
  onChangePieces,
  onResetFraming,
  onDelete,
  onClose,
}: OutfitViewerProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  /** Toile partagée par les trois vêtements, mesurée au rendu. */
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });
  const [editing, setEditing] = useState(false);
  /** Brouillon du mode modification ; la tenue n'est écrite qu'à l'enregistrement. */
  const [draft, setDraft] = useState<Selection>({ top: null, bottom: null, shoes: null });

  // Ouvrir une autre tenue (ou fermer la vue) quitte le mode modification.
  const outfitId = outfit?.id ?? null;
  useEffect(() => {
    setEditing(false);
  }, [outfitId]);

  /** Les pièces disponibles pour chaque poste, regroupées par famille. */
  const bySlot = useMemo(() => {
    const groups = { top: [], bottom: [], shoes: [] } as Record<OutfitSlot, Piece[]>;

    for (const piece of pieces.values()) {
      // Une pièce de la caisse « À donner » n'est plus proposée en modification.
      if (isInCrate(piece)) continue;
      const family = familyForCategory(piece.category);
      if (family === 'top' || family === 'bottom' || family === 'shoes') {
        groups[family].push(piece);
      }
    }

    return groups;
  }, [pieces]);

  if (!outfit) return null;

  const season = findSeason(outfit.season);
  const shown = editing ? draft : selectionOf(outfit);
  const changed = OUTFIT_SLOTS.some((slot) => draft[slot.key] !== outfit[slot.key]);
  const hasFraming = Object.keys(outfit.layouts).length > 0;

  const startEditing = () => {
    setDraft(selectionOf(outfit));
    setEditing(true);
  };

  const save = () => {
    if (!changed || onChangePieces(outfit, draft)) setEditing(false);
  };

  return (
    <Modal visible animationType="fade" onRequestClose={editing ? () => setEditing(false) : onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
          },
        ]}
      >
        <View style={styles.bar}>
          {editing ? (
            <PillButton label="Annuler" onPress={() => setEditing(false)} />
          ) : (
            <CircleButton icon="close" label="Fermer" onPress={onClose} />
          )}

          {editing ? (
            <Text style={[typography.heading, { color: colors.text }]}>Retouches</Text>
          ) : season ? (
            <View
              style={[
                styles.season,
                { backgroundColor: colors[colorNameForSeason(season.id)], borderRadius: radius.full },
              ]}
            >
              <Ionicons name={SEASON_ICONS[season.id]} size={14} color={colors.onPrimary} />
              <Text style={[styles.seasonLabel, { color: colors.onPrimary }]}>{season.label}</Text>
            </View>
          ) : (
            <View />
          )}

          {editing ? (
            <PillButton label="Enregistrer" icon="checkmark" primary onPress={save} />
          ) : (
            <CircleButton
              icon={outfit.favorite ? 'star' : 'star-outline'}
              label={outfit.favorite ? 'Retirer des favoris' : 'Mettre en favori'}
              selected={outfit.favorite}
              onPress={() => onToggleFavorite(outfit)}
            />
          )}
        </View>

        <View
          style={styles.silhouette}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setCanvas({ width, height });
          }}
        >
          {canvas.width > 0 && <SlotBands canvas={canvas} />}
          {canvas.width > 0 &&
            OUTFIT_SLOTS.map((slot, rank) => {
              const pieceId = shown[slot.key];
              const piece = pieceId ? pieces.get(pieceId) : undefined;
              // Le cadrage propre à la tenue n'a été réglé que pour le vêtement
              // d'origine : un vêtement choisi en modification prend le sien.
              const layout =
                piece && pieceId === outfit[slot.key]
                  ? outfit.layouts[slot.key] ?? piece.layout
                  : piece?.layout;

              if (!editing) {
                if (!piece || !layout) return null;
                return (
                  <GarmentLayer
                    key={slot.key}
                    pieces={[piece]}
                    index={0}
                    slot={rank}
                    canvas={canvas}
                    layout={layout}
                    interactive={false}
                  />
                );
              }

              const options = bySlot[slot.key];
              return (
                <GarmentLayer
                  key={slot.key}
                  pieces={options}
                  // -1 : poste vide, les flèches permettent d'y mettre un vêtement.
                  index={piece ? options.indexOf(piece) : -1}
                  slot={rank}
                  canvas={canvas}
                  layout={layout ?? DEFAULT_LAYOUT}
                  onIndexChange={(next) =>
                    setDraft((current) => ({ ...current, [slot.key]: options[next]?.id ?? null }))
                  }
                  showArrows
                  interactive={false}
                />
              );
            })}
        </View>

        {editing ? (
          <View style={[styles.hint, { backgroundColor: colors.surfaceAlt, borderRadius: radius.full }]}>
            <Ionicons name="swap-horizontal" size={16} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Change une pièce avec les flèches
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.dock,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.xl,
                paddingVertical: spacing.sm + 2,
                shadowColor: colors.primary,
              },
            ]}
          >
            <DockButton icon="color-wand" label="Modifier" color={colors.primary} onPress={startEditing} />
            {/* Seulement si la tenue a un cadrage à oublier. */}
            {hasFraming && (
              <DockButton
                icon="refresh"
                label="Recentrer"
                accessibilityLabel="Réinitialiser le cadrage"
                color={colors.bottom}
                onPress={() => onResetFraming(outfit)}
              />
            )}
            <DockButton
              icon="trash"
              label="Supprimer"
              accessibilityLabel="Supprimer la tenue"
              color={colors.danger}
              onPress={() => onDelete(outfit)}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

type CircleButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Bulle pleine, couleur principale (favori actif). */
  selected?: boolean;
};

/** Bulle ronde de la barre du haut. */
function CircleButton({ icon, label, onPress, selected = false }: CircleButtonProps) {
  const { radius } = useTheme();

  return (
    <Relief
      tone={selected ? 'primary' : 'surface'}
      onPress={onPress}
      borderRadius={radius.full}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={6}
      faceStyle={styles.circle}
    >
      {(ink) => <Ionicons name={icon} size={22} color={ink} />}
    </Relief>
  );
}

type PillButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
};

/** Pastille de texte, pour les deux choix du mode modification. */
function PillButton({ label, onPress, icon, primary = false }: PillButtonProps) {
  const { radius } = useTheme();

  return (
    <Relief
      tone={primary ? 'primary' : 'surface'}
      onPress={onPress}
      borderRadius={radius.full}
      hitSlop={6}
      faceStyle={styles.pill}
    >
      {(ink) => (
        <>
          {icon && <Ionicons name={icon} size={16} color={ink} />}
          <Text style={[styles.pillLabel, { color: ink }]}>{label}</Text>
        </>
      )}
    </Relief>
  );
}

type DockButtonProps = {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

/** Action du dock : une pastille teintée de sa couleur, l'icône, et son nom dessous. */
function DockButton({ icon, label, color, onPress, accessibilityLabel }: DockButtonProps) {
  const { colors, radius, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.dockItem, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}
    >
      <View style={[styles.dockBubble, { backgroundColor: `${color}${TINT}`, borderRadius: radius.full }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[typography.caption, styles.dockLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  circle: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pillLabel: { fontSize: 15, fontFamily: fonts.heading },
  season: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  seasonLabel: { fontSize: 14, fontFamily: fonts.heading },
  silhouette: { flex: 1 },
  hint: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  dockItem: { alignItems: 'center', gap: 6, minWidth: 76 },
  dockBubble: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLabel: { fontFamily: fonts.heading },
});
