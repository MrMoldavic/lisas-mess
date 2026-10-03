import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { OPTIONAL_KINDS, equipItem, isOwned, jokersLeft, listOutfits, listPieces, unequip } from '@/services';
import type { OptionalKind, ShopItem, ShopState } from '@/services';
import { colorsFor, fonts, isFabricName } from '@/theme';

import { Button, Relief } from './Button';
import type { Tone } from './Button';
import { Confetti } from './Confetti';
import { FabricPattern } from './FabricPattern';
import { iconPack } from './iconPacks';
import { Mascot } from './Mascot';
import { OutfitThumbnail } from './OutfitThumbnail';
import { outfitFrame } from './outfitFrames';
import { voiceFor } from './voices';

/** Time between two confetti bursts while previewing a confetti style, in ms. */
const BURST_EVERY = 3200;

type ShopItemPreviewProps = {
  /** `null` hides the page. */
  item: ShopItem | null;
  shop: ShopState;
  balance: number;
  onBuy: (item: ShopItem) => void;
  onClose: () => void;
};

/** An article shown big, in situation, before buying it: the companion, the confetti falling, the frame on an outfit… */
export function ShopItemPreview({ item, shop, balance, onBuy, onClose }: ShopItemPreviewProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [burst, setBurst] = useState(0);

  const isConfetti = item?.kind === 'confetti';
  useEffect(() => {
    if (!isConfetti) return;
    const timer = setInterval(() => setBurst((current) => current + 1), BURST_EVERY);
    return () => clearInterval(timer);
  }, [isConfetti]);

  if (!item) return null;

  const owned = isOwned(item.id, shop);
  const chosen = item.kind !== 'joker' && shop[item.kind] === item.id;
  const optional = (OPTIONAL_KINDS as readonly string[]).includes(item.kind);
  const affordable = balance >= item.price;
  // A fabric is previewed as the background of the page itself.
  const sample = item.kind === 'fabric' ? colorsFor('light', isFabricName(item.id) ? item.id : 'lin') : colors;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: sample.background,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
          },
        ]}
      >
        {item.kind === 'pattern' && <FabricPattern pattern={item.id} />}

        <View style={styles.bar}>
          <Relief
            tone="surface"
            onPress={onClose}
            borderRadius={radius.full}
            accessibilityLabel="Fermer"
            hitSlop={6}
            faceStyle={styles.close}
          >
            {(ink) => <Ionicons name="close" size={22} color={ink} />}
          </Relief>
        </View>

        <View style={styles.stage}>
          <BigPreview item={item} shop={shop} />
        </View>

        <View style={[styles.info, { gap: spacing.xs }]}>
          <Text style={[typography.title, styles.centered, { color: sample.text }]}>{item.name}</Text>
          <Text style={[typography.body, styles.centered, { color: sample.textMuted }]}>{item.description}</Text>
        </View>

        {item.kind === 'joker' || !owned ? (
          <Button
            label={`Acheter · ${item.price} bobinous`}
            variant={affordable ? 'primary' : 'surface'}
            onPress={() => onBuy(item)}
          />
        ) : chosen && optional ? (
          <Button label="Retirer" variant="surface" onPress={() => unequip(item.kind as OptionalKind)} />
        ) : chosen ? (
          <View style={[styles.chosen, { backgroundColor: colors.secondary, borderRadius: radius.full }]}>
            <Ionicons name="checkmark" size={18} color={colors.onSecondary} />
            <Text style={[styles.chosenText, { color: colors.onSecondary }]}>Choisi</Text>
          </View>
        ) : (
          <Button label="Choisir" variant="secondary" onPress={() => equipItem(item.id)} />
        )}
      </View>

      {isConfetti && <Confetti key={burst} variant={item.id} duration={3000} />}
    </Modal>
  );
}

/** The article itself, as big as the page allows. */
function BigPreview({ item, shop }: { item: ShopItem; shop: ShopState }) {
  const { colors, radius, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const big = Math.min(240, width * 0.6);

  switch (item.kind) {
    case 'avatar':
      return <Mascot avatar={item.id} size={big} outline={5} shadow={false} accessory={null} />;
    case 'accessory':
      return <Mascot size={big} outline={5} shadow={false} accessory={item.id} />;
    case 'pattern':
    case 'confetti':
      return <Mascot size={big * 0.75} outline={5} shadow={false} />;
    case 'voice': {
      const voice = voiceFor(item.id);
      return (
        <View style={[styles.voice, { gap: spacing.md }]}>
          <Mascot size={110} outline={4} shadow={false} />
          {[`${voice.hello[0]} ${voice.prompt}`, voice.done(30)].map((line) => (
            <View key={line} style={[styles.bubble, { backgroundColor: colors.surface, borderBottomColor: colors.surfaceDeep, borderRadius: radius.md }]}>
              <Text style={[styles.bubbleText, { color: colors.text }]}>{line}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'fabric': {
      const sample = colorsFor('light', isFabricName(item.id) ? item.id : 'lin');
      return (
        <View style={[styles.fabricCard, { backgroundColor: sample.surface, borderBottomColor: sample.surfaceDeep, borderRadius: radius.lg }]}>
          <View style={[styles.fabricStitch, { borderColor: sample.stitch }]} />
          <Mascot size={96} />
          <View style={[styles.fabricLine, { backgroundColor: sample.surfaceAlt, width: '70%' }]} />
          <View style={[styles.fabricLine, { backgroundColor: sample.surfaceAlt, width: '50%' }]} />
        </View>
      );
    }
    case 'frame':
      return <FramePreview frame={item.id} />;
    case 'icons': {
      const pack = iconPack(item.id);
      const tiles: { tone: Tone; icon: typeof pack.pieces; label: string }[] = [
        { tone: 'primary', icon: pack.pieces, label: 'Garde-robe' },
        { tone: 'accent', icon: pack.outfits, label: 'Mes tenues' },
        { tone: 'secondary', icon: pack.create, label: 'Créer' },
        { tone: 'wood', icon: pack.shop, label: 'Boutique' },
      ];
      return (
        <View style={[styles.tiles, { rowGap: spacing.md }]}>
          {tiles.map((tile) => (
            <View key={tile.label} style={styles.tile}>
              <Relief tone={tile.tone} onPress={() => {}} borderRadius={radius.lg} faceStyle={styles.tileFace}>
                {(ink) => <Ionicons name={tile.icon} size={36} color={ink} />}
              </Relief>
              <Text style={[styles.tileLabel, { color: colors.text }]}>{tile.label}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'joker':
      return (
        <View style={[styles.joker, { gap: spacing.md }]}>
          <View style={[styles.jokerStar, { backgroundColor: colors.secondary }]}>
            <Ionicons name="star" size={56} color={colors.onSecondary} />
          </View>
          <Text style={[styles.jokerText, { color: colors.text }]}>
            Sur la carte du défi de l'accueil, touche un jour raté : le joker le rattrape et ta semaine reste complète.
          </Text>
          <Text style={[styles.jokerCount, { color: colors.textMuted }]}>Tu en as {Math.max(0, jokersLeft(shop))}</Text>
        </View>
      );
  }
}

/** A frame around one of the outfits already created, or around an empty card if there is none yet. */
function FramePreview({ frame }: { frame: string }) {
  const { colors } = useTheme();
  const sampleOutfit = useMemo(() => listOutfits()[0] ?? null, []);
  const pieces = useMemo(() => new Map(listPieces().map((piece) => [piece.id, piece])), []);
  const look = outfitFrame(frame, colors);
  const width = 190;
  const height = 240;

  return (
    <View style={[styles.frameCard, { width, height, backgroundColor: colors.surfaceAlt }, look?.style]}>
      <View style={[styles.framePhoto, { backgroundColor: colors.surfaceAlt }]}>
        {sampleOutfit && look ? (
          <OutfitThumbnail
            outfit={sampleOutfit}
            pieces={pieces}
            width={width - look.inset.left - look.inset.right}
            height={height - look.inset.top - look.inset.bottom}
          />
        ) : (
          <Ionicons name="shirt" size={48} color={colors.textMuted} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row' },
  close: { width: 46, height: 46 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { alignItems: 'center' },
  centered: { textAlign: 'center' },
  chosen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  chosenText: { fontFamily: fonts.heading, fontSize: 17 },
  voice: { alignItems: 'center', alignSelf: 'stretch' },
  bubble: { alignSelf: 'stretch', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 4 },
  bubbleText: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, textAlign: 'center' },
  fabricCard: { width: 240, height: 260, alignItems: 'center', justifyContent: 'center', gap: 14, borderBottomWidth: 5 },
  fabricStitch: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1.6,
    borderStyle: 'dashed',
    borderRadius: 18,
  },
  fabricLine: { height: 12, borderRadius: 6 },
  frameCard: { overflow: 'hidden', borderRadius: 14 },
  framePhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tiles: { width: 260, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', alignItems: 'center', gap: 8 },
  tileFace: { width: 96, height: 96 },
  tileLabel: { fontFamily: fonts.heading, fontSize: 15 },
  joker: { alignItems: 'center', paddingHorizontal: 12 },
  jokerStar: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  jokerText: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  jokerCount: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
