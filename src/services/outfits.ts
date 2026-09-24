import { File, Paths } from 'expo-file-system';

import type { SeasonId } from '@/types';

/**
 * Stockage des tenues.
 *
 * Contrairement aux pièces, une tenue n'a pas de fichier propre : c'est une
 * combinaison de trois identifiants de pièces. Le dossier ne peut donc plus
 * servir d'index, et un unique fichier JSON prend le relais. Il restera lisible
 * et suffisant tant que les tenues se comptent en centaines.
 */
const OUTFITS_FILE = new File(Paths.document, 'outfits.json');

export type Outfit = {
  id: string;
  /** Identifiants de pièces (le nom de fichier de la photo), `null` si le poste est vide. */
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  season: SeasonId | null;
  favorite: boolean;
  createdAt: number;
};

/** Une tenue naît sans être favorite : le champ n'appartient pas au brouillon. */
export type OutfitDraft = Omit<Outfit, 'id' | 'createdAt' | 'favorite'>;

function readAll(): Outfit[] {
  if (!OUTFITS_FILE.exists) return [];

  try {
    const parsed: unknown = JSON.parse(OUTFITS_FILE.textSync());
    if (!Array.isArray(parsed)) return [];

    // Normalisation à la lecture : les tenues enregistrées avant l'arrivée des
    // favoris n'ont pas le champ, et `undefined` se propagerait jusqu'à l'écran.
    return (parsed as Outfit[]).map((outfit) => ({
      ...outfit,
      favorite: outfit.favorite === true,
    }));
  } catch {
    // Fichier tronqué ou corrompu : mieux vaut repartir d'une liste vide que
    // faire planter l'écran. Les photos, elles, ne sont jamais perdues.
    return [];
  }
}

function writeAll(outfits: Outfit[]): void {
  if (!OUTFITS_FILE.exists) {
    OUTFITS_FILE.create({ intermediates: true, overwrite: true });
  }
  OUTFITS_FILE.write(JSON.stringify(outfits));
}

/** De la plus récente à la plus ancienne. */
export function listOutfits(): Outfit[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export class DuplicateOutfitError extends Error {
  constructor(readonly existing: Outfit) {
    super('Cette combinaison de vêtements est déjà enregistrée.');
    this.name = 'DuplicateOutfitError';
  }
}

/**
 * Cherche une tenue composée exactement des mêmes vêtements.
 *
 * La saison n'entre pas dans la comparaison : ce qui définit une tenue, ce sont
 * les vêtements qui la composent. Deux tenues identiques étiquetées « été » et
 * « hiver » resteraient visuellement le même assemblage dans la grille.
 */
export function findDuplicate(draft: OutfitDraft): Outfit | null {
  return (
    readAll().find(
      (outfit) =>
        outfit.top === draft.top &&
        outfit.bottom === draft.bottom &&
        outfit.shoes === draft.shoes
    ) ?? null
  );
}

/** @throws {DuplicateOutfitError} si la même combinaison existe déjà. */
export function addOutfit(draft: OutfitDraft): Outfit {
  const existing = findDuplicate(draft);
  if (existing) {
    // Le contrôle vit ici plutôt que dans l'écran : tout futur point d'appel en
    // hérite, sans avoir à se souvenir de vérifier.
    throw new DuplicateOutfitError(existing);
  }

  const outfit: Outfit = {
    ...draft,
    favorite: false,
    id: `${Date.now()}`,
    createdAt: Date.now(),
  };

  writeAll([...readAll(), outfit]);
  return outfit;
}

/** Bascule le favori et renvoie l'état obtenu. */
export function toggleOutfitFavorite(id: string): boolean {
  let result = false;

  writeAll(
    readAll().map((outfit) => {
      if (outfit.id !== id) return outfit;
      result = !outfit.favorite;
      return { ...outfit, favorite: result };
    })
  );

  return result;
}

export function removeOutfit(id: string): void {
  writeAll(readAll().filter((outfit) => outfit.id !== id));
}

/**
 * Supprime les références aux pièces disparues.
 * Une photo effacée ne doit pas laisser une tenue pointer dans le vide.
 */
export function forgetPiece(pieceId: string): void {
  const cleaned = readAll().map((outfit) => ({
    ...outfit,
    top: outfit.top === pieceId ? null : outfit.top,
    bottom: outfit.bottom === pieceId ? null : outfit.bottom,
    shoes: outfit.shoes === pieceId ? null : outfit.shoes,
  }));

  writeAll(cleaned);
}
