import { File, Paths } from 'expo-file-system';

/** Purchases and equipped items, in one JSON file next to the outfits. */
const SHOP_FILE = new File(Paths.document, 'shop.json');

/** Kinds that can be taken off, leaving nothing of that kind equipped. */
export const OPTIONAL_KINDS = ['accessory', 'pattern', 'confetti', 'frame', 'voice', 'icons'] as const;
export type OptionalKind = (typeof OPTIONAL_KINDS)[number];

/** `joker` is a consumable: bought as many times as wanted, never equipped. */
export type ShopItemKind = 'avatar' | 'fabric' | OptionalKind | 'joker';

export type ShopItem = {
  id: string;
  kind: ShopItemKind;
  name: string;
  /** In bobinous; `0` means owned from the start. */
  price: number;
  description: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'bobine', kind: 'avatar', name: 'Bobine', price: 0, description: 'Une bobine de fil, jamais à bout.' },
  { id: 'chaussette', kind: 'avatar', name: 'Chaussette', price: 150, description: 'Une chaussette, jamais dépareillée.' },
  { id: 'timbre', kind: 'avatar', name: 'Timbré', price: 200, description: 'Un timbre-poste un peu timbré.' },
  { id: 'pique', kind: 'avatar', name: 'Pique', price: 250, description: 'Une tomate à épingles. Ça pique !' },
  { id: 'roucoule', kind: 'avatar', name: 'Roucoule', price: 250, description: 'Un pigeon, roi du trottoir.' },
  { id: 'grignote', kind: 'avatar', name: 'Grignote', price: 250, description: 'Une souris qui grignote tes pulls.' },
  { id: 'myopie', kind: 'avatar', name: 'Myopie', price: 300, description: 'Un Shih Tzu qui ne voit rien venir.' },
  { id: 'jean-miette', kind: 'avatar', name: 'Jean-Miette', price: 300, description: 'Un chat tigré qui squatte le linge.' },
  { id: 'cubik', kind: 'avatar', name: 'Cubik', price: 350, description: "Un Rubik's cube, jamais résolu." },
  { id: 'pif', kind: 'avatar', name: 'Pif', price: 600, description: 'Un nez avec des yeux, et du flair.' },
  { id: 'lunettes', kind: 'accessory', name: 'Lunettes rondes', price: 120, description: 'Des lunettes rondes, très intello.' },
  { id: 'lunettes-star', kind: 'accessory', name: 'Lunettes de star', price: 180, description: 'Des lunettes de star, incognito.' },
  { id: 'voix-poete', kind: 'voice', name: 'Poète', price: 150, description: 'Un ton poète, en vers et contre tout.' },
  { id: 'voix-raleur', kind: 'voice', name: 'Râleur', price: 150, description: 'Un ton râleur, mais au grand cœur.' },
  { id: 'lin', kind: 'fabric', name: 'Lin', price: 0, description: "Le tissu d'origine de l'atelier." },
  { id: 'jean', kind: 'fabric', name: 'Jean', price: 100, description: 'Toile bleue et surpiqûres orange.' },
  { id: 'vichy', kind: 'fabric', name: 'Rose poudré', price: 150, description: 'Un rose tendre, comme un vichy pastel.' },
  { id: 'menthe', kind: 'fabric', name: 'Menthe', price: 150, description: "Un vert d'eau tout frais." },
  { id: 'pois', kind: 'pattern', name: 'Pois', price: 120, description: 'Des petits pois, sans la purée.' },
  { id: 'carreaux', kind: 'pattern', name: 'Carreaux', price: 120, description: 'Des carreaux, version pique-nique.' },
  { id: 'confettis-coeurs', kind: 'confetti', name: 'Cœurs', price: 100, description: 'Des confettis cœurs, pour fondre.' },
  { id: 'confettis-etoiles', kind: 'confetti', name: 'Étoiles', price: 100, description: 'Des confettis étoiles, pour briller.' },
  { id: 'confettis-cacas', kind: 'confetti', name: 'Cacas', price: 150, description: 'Des confettis cacas, ça porte bonheur.' },
  { id: 'cadre-polaroid', kind: 'frame', name: 'Polaroid', price: 120, description: 'Un cadre polaroid, souvenir garanti.' },
  { id: 'cadre-dore', kind: 'frame', name: 'Cadre doré', price: 200, description: "Un cadre doré, digne d'un musée." },
  { id: 'icones-fleuries', kind: 'icons', name: 'Pack fleuri', price: 150, description: 'Des icônes fleuries, ça pousse.' },
  { id: 'icones-espace', kind: 'icons', name: 'Pack spatial', price: 150, description: "Des icônes de l'espace. Décollage !" },
  { id: 'joker', kind: 'joker', name: 'Joker', price: 100, description: 'Un joker : un jour raté, effacé.' },
];

export type Purchase = { id: string; price: number; at: number };

export type ShopState = {
  purchases: Purchase[];
  /** Equipped mascot, see `SHOP_ITEMS` of kind `avatar`. */
  avatar: string;
  /** Equipped background fabric, see `SHOP_ITEMS` of kind `fabric`. */
  fabric: string;
  /** Optional equipped items, `null` for none. */
  accessory: string | null;
  pattern: string | null;
  confetti: string | null;
  frame: string | null;
  voice: string | null;
  icons: string | null;
  /** Missed challenge days (AAAA-MM-JJ) caught up with a joker. */
  jokerDays: string[];
  /** Bobinous given outside the workshop (test grants). */
  bonus: number;
};

const DEFAULT_STATE: ShopState = {
  purchases: [],
  avatar: 'bobine',
  fabric: 'lin',
  accessory: null,
  pattern: null,
  confetti: null,
  frame: null,
  voice: null,
  icons: null,
  jokerDays: [],
  bonus: 0,
};

export class ShopError extends Error {}

function read(): ShopState {
  try {
    if (!SHOP_FILE.exists) return DEFAULT_STATE;
    const parsed = JSON.parse(SHOP_FILE.textSync()) as Partial<ShopState>;
    const optional = Object.fromEntries(
      OPTIONAL_KINDS.map((kind) => [kind, findShopItem(parsed[kind] ?? undefined)?.kind === kind ? parsed[kind] : null])
    ) as Pick<ShopState, OptionalKind>;
    return {
      ...optional,
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      avatar: findShopItem(parsed.avatar)?.kind === 'avatar' ? parsed.avatar! : DEFAULT_STATE.avatar,
      fabric: findShopItem(parsed.fabric)?.kind === 'fabric' ? parsed.fabric! : DEFAULT_STATE.fabric,
      jokerDays: Array.isArray(parsed.jokerDays) ? parsed.jokerDays : [],
      bonus: typeof parsed.bonus === 'number' ? parsed.bonus : 0,
    };
  } catch {
    // A missing file system (web) or a corrupt file falls back to the starting state.
    return DEFAULT_STATE;
  }
}

let state: ShopState | null = null;
const listeners = new Set<() => void>();

/** Current shop state; the same object until something changes, as `useSyncExternalStore` requires. */
export function getShopState(): ShopState {
  state ??= read();
  return state;
}

export function subscribeShop(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function save(next: ShopState): void {
  if (!SHOP_FILE.exists) SHOP_FILE.create({ intermediates: true, overwrite: true });
  SHOP_FILE.write(JSON.stringify(next));
  state = next;
  listeners.forEach((listener) => listener());
}

export function findShopItem(id: string | undefined): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function isOwned(id: string, shop: ShopState = getShopState()): boolean {
  const item = findShopItem(id);
  if (!item || item.kind === 'joker') return false;
  return item.price === 0 || shop.purchases.some((purchase) => purchase.id === id);
}

/** Spendable bobinous: what the workshop earned, plus grants, minus purchases. */
export function bobinousBalance(earned: number, shop: ShopState = getShopState()): number {
  const spent = shop.purchases.reduce((sum, purchase) => sum + purchase.price, 0);
  return Math.max(0, earned + shop.bonus - spent);
}

/** Jokers bought and not used yet. */
export function jokersLeft(shop: ShopState = getShopState()): number {
  return shop.purchases.filter((purchase) => purchase.id === 'joker').length - shop.jokerDays.length;
}

/** Spends a joker on a missed challenge day; throws a `ShopError` if none is left or the day is already caught up. */
export function spendJoker(day: string): void {
  const shop = getShopState();
  if (jokersLeft(shop) <= 0) throw new ShopError("Tu n'as plus de joker : la boutique en vend.");
  if (shop.jokerDays.includes(day)) throw new ShopError('Ce jour est déjà rattrapé.');
  save({ ...shop, jokerDays: [...shop.jokerDays, day] });
}

/** Puts every companion back on sale (their bobinous return to the jar) and Bobine back on, for testing the shop. */
export function resetCompanions(): void {
  const shop = getShopState();
  save({
    ...shop,
    purchases: shop.purchases.filter((purchase) => findShopItem(purchase.id)?.kind !== 'avatar'),
    avatar: DEFAULT_STATE.avatar,
  });
}

/** Adds bobinous to the jar without earning them, for testing the shop. */
export function grantBobinous(amount: number): void {
  const shop = getShopState();
  save({ ...shop, bonus: shop.bonus + amount });
}

/** Puts on an owned item, in the slot of its kind (companion, fabric, accessory…). */
export function equipItem(id: string): void {
  const item = findShopItem(id);
  if (!item || item.kind === 'joker' || !isOwned(id)) throw new ShopError("Cet article ne t'appartient pas encore.");
  save({ ...getShopState(), [item.kind]: id });
}

/** Takes off the item of an optional kind (accessory, pattern…). */
export function unequip(kind: OptionalKind): void {
  save({ ...getShopState(), [kind]: null });
}

/** Buys an item with bobinous and equips it (a joker is only added to the stock); throws a `ShopError` if impossible. */
export function buyItem(id: string, balance: number): void {
  const item = findShopItem(id);
  if (!item) throw new ShopError('Article introuvable.');
  if (isOwned(id)) throw new ShopError('Tu as déjà cet article.');
  if (balance < item.price) throw new ShopError(`Il te manque ${item.price - balance} bobinous.`);

  const shop = getShopState();
  save({ ...shop, purchases: [...shop.purchases, { id, price: item.price, at: Date.now() }] });
  if (item.kind !== 'joker') equipItem(id);
}
