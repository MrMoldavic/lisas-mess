import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { CompanionWelcome, FabricPattern, Mascot, Relief, Screen, SewingButton, ShopItemPreview } from '@/components';
import { CONFETTI_GLYPHS } from '@/components/Confetti';
import { iconPack } from '@/components/iconPacks';
import { outfitFrame } from '@/components/outfitFrames';
import { useShop } from '@/hooks/useShop';
import { useTheme } from '@/hooks/useTheme';
import {
  OPTIONAL_KINDS,
  SHOP_ITEMS,
  ShopError,
  buyItem,
  equipItem,
  isOwned,
  jokersLeft,
  unequip,
  leftCount,
  listOutfits,
  listPieces,
  bobinousBalance,
  grantBobinous,
  resetCompanions,
  workshopStatus,
  lastEarnedBobinous,
} from '@/services';
import type { OptionalKind, ShopItem, ShopItemKind, ShopState } from '@/services';
import { colorsFor, fonts, isFabricName } from '@/theme';

const SECTIONS: { kind: ShopItemKind; title: string; caption: string }[] = [
  { kind: 'avatar', title: 'Compagnons', caption: "Choisis qui te parle dans l'atelier." },
  { kind: 'accessory', title: 'Accessoires', caption: 'Ton compagnon les porte partout.' },
  { kind: 'voice', title: 'Personnalité', caption: "Le ton de ton compagnon à l'accueil." },
  { kind: 'fabric', title: 'Tissus', caption: "Change le fond de toute l'appli." },
  { kind: 'pattern', title: 'Motifs', caption: 'Imprimés sur le fond, par-dessus le tissu.' },
  { kind: 'confetti', title: 'Confettis', caption: 'Pour fêter chaque tenue créée.' },
  { kind: 'frame', title: 'Cadres', caption: 'Autour de tes tenues, dans « Mes tenues ».' },
  { kind: 'icons', title: 'Icônes', caption: "Les rubriques de l'accueil, relookées." },
  { kind: 'joker', title: 'Jokers', caption: 'Touche un jour raté de la semaine des défis pour le rattraper.' },
];

function isOptional(kind: ShopItemKind): kind is OptionalKind {
  return (OPTIONAL_KINDS as readonly string[]).includes(kind);
}

/** Bobinous earned by the workshop, read from the saved pieces and outfits. */
function readEarned(): number {
  return workshopStatus(listPieces(), listOutfits(), leftCount()).buttons;
}

/** Each department, its articles laid out two by two for the virtualised list. */
const SHOP_SECTIONS = SECTIONS.map((section) => {
  const items = SHOP_ITEMS.filter((item) => item.kind === section.kind);
  const rows: ShopItem[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return { ...section, data: rows };
});

/** The shop: bobinous buy companions and fabrics; real-money options will come later. */
export default function ShopScreen() {
  const { colors, radius, spacing, typography } = useTheme();
  const shop = useShop();
  // The header shows at once with the balance last computed (by the home page); the cards wait one frame, so the screen
  // slides in immediately and fills during the animation, which runs natively.
  const [earned, setEarned] = useState(() => lastEarnedBobinous() ?? 0);
  const [cardsReady, setCardsReady] = useState(false);
  /** Companion just bought, welcomed on its own page. */
  const [welcome, setWelcome] = useState<ShopItem | null>(null);
  /** Article shown big before buying it. */
  const [preview, setPreview] = useState<ShopItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => {
        setEarned(readEarned());
        setCardsReady(true);
      });
      return () => cancelAnimationFrame(frame);
    }, [])
  );

  const balance = bobinousBalance(earned, shop);

  const buy = useCallback((item: ShopItem) => {
    if (balance < item.price) {
      Alert.alert(
        'Pas assez de bobinous',
        `Il te manque ${item.price - balance} bobinous. Crée des tenues et relève les défis pour en gagner !`
      );
      return;
    }
    Alert.alert(`Acheter ${item.name} ?`, `${item.price} bobinous sortiront de ton bocal.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Acheter',
        onPress: () => {
          try {
            buyItem(item.id, balance);
            if (item.kind === 'avatar') {
              // The welcome page replaces the preview; iOS cannot present it while the alert or the preview is still closing.
              setPreview(null);
              setTimeout(() => setWelcome(item), Platform.OS === 'ios' ? 500 : 0);
            }
          } catch (error) {
            Alert.alert('Achat impossible', error instanceof ShopError ? error.message : String(error));
          }
        },
      },
    ]);
  }, [balance]);

  const header = useMemo(
    () => (
      <View style={{ gap: spacing.lg }}>
        <View style={[styles.speaker, { gap: spacing.sm }]}>
          <Mascot size={56} />
          <View
            style={[
              styles.bubble,
              { backgroundColor: colors.surface, borderBottomColor: colors.surfaceDeep, borderRadius: radius.md },
            ]}
          >
            <View style={[styles.tail, { backgroundColor: colors.surface }]} />
            <Text style={[styles.speech, { color: colors.text }]}>
              Tu as <Text style={{ color: colors.accentDeep }}>{balance} bobinous</Text> à dépenser !
            </Text>
          </View>
        </View>

        {/* Development builds only (Expo Go): never shipped in a release build. */}
        {__DEV__ && (
          <View style={[styles.devTools, { gap: spacing.sm }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => grantBobinous(1000)}
              style={[styles.devGrant, { borderColor: colors.accentDeep, borderRadius: radius.full }]}
            >
              <Text style={[styles.devGrantText, { color: colors.accentDeep }]}>+1000 bobinous (test)</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={resetCompanions}
              style={[styles.devGrant, { borderColor: colors.accentDeep, borderRadius: radius.full }]}
            >
              <Text style={[styles.devGrantText, { color: colors.accentDeep }]}>Compagnons en vente (test)</Text>
            </Pressable>
          </View>
        )}
      </View>
    ),
    [balance, colors, radius, spacing]
  );

  return (
    <Screen>
      {/* Virtualised: only the first rows are drawn on opening, the companions' drawings being costly. */}
      <SectionList
        sections={cardsReady ? SHOP_SECTIONS : []}
        keyExtractor={(row) => row.map((item) => item.id).join('+')}
        stickySectionHeadersEnabled={false}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
            <Text style={[typography.heading, { color: colors.text }]}>{section.title}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{section.caption}</Text>
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((item) => (
              <ItemCard key={item.id} item={item} shop={shop} balance={balance} onBuy={buy} onPreview={setPreview} />
            ))}
          </View>
        )}
        ListFooterComponent={
          // Only once the cards are there, so it does not jump down when they arrive.
          cardsReady ? (
            <View
              style={[
                styles.premium,
                {
                  marginTop: spacing.lg,
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.stitch,
                  borderRadius: radius.lg,
                  gap: spacing.sm,
                },
              ]}
            >
              <Ionicons name="diamond" size={22} color={colors.primary} />
              <View style={styles.premiumText}>
                <Text style={[typography.heading, { color: colors.text }]}>Premium</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Bientôt : des options pour aller encore plus loin.
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      <ShopItemPreview item={preview} shop={shop} balance={balance} onBuy={buy} onClose={() => setPreview(null)} />
      <CompanionWelcome companion={welcome} onContinue={() => setWelcome(null)} />
    </Screen>
  );
}

type ItemCardProps = {
  item: ShopItem;
  shop: ShopState;
  balance: number;
  onBuy: (item: ShopItem) => void;
  onPreview: (item: ShopItem) => void;
};

/** One article: its preview, its name, and what can be done with it (buy, choose, or chosen). */
const ItemCard = memo(function ItemCard({ item, shop, balance, onBuy, onPreview }: ItemCardProps) {
  const { colors, radius, typography } = useTheme();
  const owned = isOwned(item.id, shop);
  const chosen = item.kind !== 'joker' && shop[item.kind] === item.id;
  const affordable = balance >= item.price;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Voir ${item.name} en grand`}
      onPress={() => onPreview(item)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.surfaceDeep,
          borderRadius: radius.lg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.preview}>
        <Preview item={item} shop={shop} />
      </View>
      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
      <Text style={[typography.caption, styles.description, { color: colors.textMuted }]} numberOfLines={2}>
        {item.description}
      </Text>

      {chosen && isOptional(item.kind) ? (
        <Relief
          tone="surface"
          onPress={() => unequip(item.kind as OptionalKind)}
          borderRadius={radius.full}
          accessibilityLabel={`Retirer ${item.name}`}
          faceStyle={styles.action}
        >
          {(ink) => <Text style={[styles.actionText, { color: ink }]}>Retirer</Text>}
        </Relief>
      ) : chosen ? (
        <View style={[styles.chosen, { backgroundColor: colors.secondary, borderRadius: radius.full }]}>
          <Ionicons name="checkmark" size={16} color={colors.onSecondary} />
          <Text style={[styles.actionText, { color: colors.onSecondary }]}>Choisi</Text>
        </View>
      ) : owned ? (
        <Relief
          tone="secondary"
          onPress={() => equipItem(item.id)}
          borderRadius={radius.full}
          accessibilityLabel={`Choisir ${item.name}`}
          faceStyle={styles.action}
        >
          {(ink) => <Text style={[styles.actionText, { color: ink }]}>Choisir</Text>}
        </Relief>
      ) : (
        <Relief
          tone={affordable ? 'primary' : 'surface'}
          onPress={() => onBuy(item)}
          borderRadius={radius.full}
          accessibilityLabel={`Acheter ${item.name} pour ${item.price} bobinous`}
          faceStyle={styles.action}
        >
          {(ink) => (
            <>
              <SewingButton size={14} color={colors.accent} holeColor={colors.accentDeep} />
              <Text style={[styles.actionText, { color: affordable ? ink : colors.textMuted }]}>{item.price}</Text>
            </>
          )}
        </Relief>
      )}
    </Pressable>
  );
});

/** What an article looks like, drawn with the real thing whenever possible. */
function Preview({ item, shop }: { item: ShopItem; shop: ShopState }) {
  const { colors, radius } = useTheme();

  switch (item.kind) {
    case 'avatar':
      return <Mascot avatar={item.id} size={56} accessory={null} />;
    case 'accessory':
      return <Mascot size={56} accessory={item.id} />;
    case 'fabric':
      return <Swatch fabric={item.id} />;
    case 'pattern':
      return (
        <View style={[styles.swatch, { backgroundColor: colors.background, borderColor: colors.border, overflow: 'hidden' }]}>
          <FabricPattern pattern={item.id} />
        </View>
      );
    case 'voice':
      return (
        <View style={[styles.voice, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}>
          <Ionicons name={item.id === 'voix-poete' ? 'musical-notes' : 'flame'} size={30} color={colors.primary} />
        </View>
      );
    case 'confetti':
      return (
        <View style={styles.confetti}>
          {(['primary', 'top', 'bottom', 'shoes', 'spring'] as const).map((color, i) => (
            <Text key={color} style={[styles.confettiGlyph, { color: colors[color], transform: [{ rotate: `${(i - 2) * 14}deg` }] }]}>
              {CONFETTI_GLYPHS[item.id]}
            </Text>
          ))}
        </View>
      );
    case 'frame': {
      const frame = outfitFrame(item.id, colors);
      return (
        <View style={[styles.frame, frame?.style]}>
          <View style={[styles.framePhoto, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="shirt" size={18} color={colors.textMuted} />
          </View>
        </View>
      );
    }
    case 'icons': {
      const pack = iconPack(item.id);
      return (
        <View style={styles.icons}>
          {[pack.pieces, pack.outfits, pack.create, pack.shop].map((icon) => (
            <Ionicons key={icon} name={icon} size={24} color={colors.primary} />
          ))}
        </View>
      );
    }
    case 'joker':
      return (
        <View style={styles.joker}>
          <View style={[styles.jokerStar, { backgroundColor: colors.secondary }]}>
            <Ionicons name="star" size={28} color={colors.onSecondary} />
          </View>
          <Text style={[styles.jokerCount, { color: colors.textMuted }]}>Tu en as {Math.max(0, jokersLeft(shop))}</Text>
        </View>
      );
  }
}

/** A fabric sample: its background with a small stitched card on top. */
function Swatch({ fabric }: { fabric: string }) {
  const sample = colorsFor('light', isFabricName(fabric) ? fabric : 'lin');

  return (
    <View style={[styles.swatch, { backgroundColor: sample.background, borderColor: sample.border }]}>
      <View style={[styles.swatchCard, { backgroundColor: sample.surface, borderColor: sample.stitch }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  speaker: { flexDirection: 'row', alignItems: 'center' },
  bubble: { flex: 1, justifyContent: 'center', minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 4 },
  tail: { position: 'absolute', left: -6, top: '50%', marginTop: -7, width: 14, height: 14, transform: [{ rotate: '45deg' }] },
  speech: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  card: { width: '48%', alignItems: 'center', gap: 6, padding: 12, borderBottomWidth: 4 },
  preview: { height: 72, justifyContent: 'center' },
  name: { fontFamily: fonts.heading, fontSize: 17 },
  description: { textAlign: 'center', minHeight: 34 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 6 },
  actionText: { fontFamily: fonts.heading, fontSize: 15 },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 4 },
  voice: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  confetti: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  confettiGlyph: { fontSize: 20 },
  frame: { width: 56, height: 68 },
  framePhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icons: { width: 64, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  joker: { alignItems: 'center', gap: 4 },
  jokerStar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  jokerCount: { fontFamily: fonts.bodyBold, fontSize: 12 },
  swatch: { width: 64, height: 64, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  swatchCard: { width: 34, height: 26, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed' },
  devTools: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  devGrant: { borderWidth: 1.5, borderStyle: 'dashed', paddingHorizontal: 14, paddingVertical: 6 },
  devGrantText: { fontFamily: fonts.heading, fontSize: 14 },
  premium: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  premiumText: { flex: 1 },
});
