import { File, Paths } from 'expo-file-system';

import type { OutfitSlot, SeasonId } from '@/types';

import type { PieceLayout } from './pieceLayouts';

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
  /**
   * Cadrage propre à cette tenue, poste par poste. Un poste absent retombe sur
   * le cadrage par défaut du vêtement.
   *
   * C'est ce qui permet de corriger une photo mal cadrée une seule fois — au
   * niveau de la pièce — tout en gardant la main look par look.
   */
  layouts: Partial<Record<OutfitSlot, PieceLayout>>;
  createdAt: number;
};

/** Une tenue naît sans favori ni surcharge : ces champs n'appartiennent pas au brouillon. */
export type OutfitDraft = Omit<Outfit, 'id' | 'createdAt' | 'favorite' | 'layouts'>;

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
      layouts: outfit.layouts ?? {},
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
export function findDuplicate(draft: OutfitDraft, ignoreId?: string): Outfit | null {
  return (
    readAll().find(
      (outfit) =>
        outfit.id !== ignoreId &&
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
    layouts: {},
    id: `${Date.now()}`,
    createdAt: Date.now(),
  };

  writeAll([...readAll(), outfit]);
  return outfit;
}

/**
 * Remplace les vêtements d'une tenue existante.
 *
 * Le cadrage d'un poste dont le vêtement change est oublié : il avait été réglé
 * pour l'ancien vêtement et n'a aucun sens pour le nouveau. Les postes inchangés
 * gardent le leur.
 *
 * @throws {DuplicateOutfitError} si une autre tenue a déjà cette combinaison.
 */
export function updateOutfitPieces(
  id: string,
  pieces: Pick<Outfit, OutfitSlot>
): Outfit | null {
  const outfits = readAll();
  const current = outfits.find((outfit) => outfit.id === id);
  if (!current) return null;

  const existing = findDuplicate({ ...pieces, season: current.season }, id);
  if (existing) throw new DuplicateOutfitError(existing);

  const layouts = { ...current.layouts };
  for (const slot of Object.keys(pieces) as OutfitSlot[]) {
    if (pieces[slot] !== current[slot]) delete layouts[slot];
  }

  const updated: Outfit = { ...current, ...pieces, layouts };
  writeAll(outfits.map((outfit) => (outfit.id === id ? updated : outfit)));
  return updated;
}

/**
 * Fixe le cadrage d'un poste pour cette tenue seulement.
 *
 * Le cadrage par défaut du vêtement n'est pas touché : les autres tenues qui
 * l'utilisent gardent le leur.
 */
export function setOutfitSlotLayout(
  outfitId: string,
  slot: OutfitSlot,
  layout: PieceLayout
): void {
  writeAll(
    readAll().map((outfit) =>
      outfit.id === outfitId
        ? { ...outfit, layouts: { ...outfit.layouts, [slot]: layout } }
        : outfit
    )
  );
}

/**
 * Remet à 1 l'échelle enregistrée dans les tenues pour ces pièces, en gardant
 * leur position. Sert après le rognage d'une image, qui rend l'échelle obsolète.
 */
export function resetOutfitScalesFor(pieceIds: string[]): void {
  if (pieceIds.length === 0) return;
  const ids = new Set(pieceIds);

  writeAll(
    readAll().map((outfit) => {
      const layouts = { ...outfit.layouts };
      for (const slot of Object.keys(layouts) as OutfitSlot[]) {
        const pieceId = outfit[slot];
        const layout = layouts[slot];
        if (layout && pieceId && ids.has(pieceId)) layouts[slot] = { ...layout, scale: 1 };
      }
      return { ...outfit, layouts };
    })
  );
}

/** Oublie tous les cadrages propres à cette tenue : elle repart des défauts. */
export function clearOutfitLayouts(outfitId: string): void {
  writeAll(
    readAll().map((outfit) => (outfit.id === outfitId ? { ...outfit, layouts: {} } : outfit))
  );
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
 * Reporte le changement d'identifiant d'une pièce (reclasser renomme son
 * fichier) sur les tenues qui la contiennent. Leur cadrage, indexé par poste,
 * reste valable : c'est la même photo.
 */
export function renamePieceInOutfits(oldId: string, newId: string): void {
  writeAll(
    readAll().map((outfit) => ({
      ...outfit,
      top: outfit.top === oldId ? newId : outfit.top,
      bottom: outfit.bottom === oldId ? newId : outfit.bottom,
      shoes: outfit.shoes === oldId ? newId : outfit.shoes,
    }))
  );
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
