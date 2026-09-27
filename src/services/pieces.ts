import { Directory, File, Paths } from 'expo-file-system';

import type { CategoryId } from '@/types';

import {
  DEFAULT_LAYOUT,
  forgetPieceLayout,
  listLayouts,
  setPieceLayout,
} from './pieceLayouts';
import type { PieceLayout } from './pieceLayouts';
import { forgetPiece, renamePieceInOutfits } from './outfits';
import { clearVerdict, countLeft, listVerdicts, moveVerdict } from './sorting';
import type { Verdict } from './sorting';
import { trimTransparentMargins } from './trim';

/**
 * Stockage des pièces sur le disque de l'app.
 *
 * Les photos sont copiées depuis le cache (où l'appareil photo les dépose, et
 * d'où le système peut les effacer à tout moment) vers le dossier « document »,
 * qui est persistant. Le dossier fait office d'index : pas de base ni de JSON à
 * tenir synchronisé, la liste des fichiers EST la liste des pièces.
 *
 * La catégorie est encodée dans le nom du fichier — `<horodatage>__<categorie>.<ext>` —
 * ce qui évite d'introduire une base pour un seul champ. Le jour où une pièce
 * portera plusieurs attributs (couleur, saison, compteur de port), il faudra une
 * vraie table ; ce nommage restera lisible en attendant.
 */
const PIECES_DIRECTORY = new Directory(Paths.document, 'pieces');
const SEPARATOR = '__';

export type Piece = {
  /** Nom du fichier sur le disque, sert d'identifiant. */
  id: string;
  uri: string;
  /** `null` pour les pièces enregistrées avant l'arrivée des catégories. */
  category: CategoryId | null;
  /** Cadrage d'affichage : taille et position, neutres si jamais ajustés. */
  layout: PieceLayout;
  /** Décision du tri, `null` si la pièce n'est jamais passée au tri. */
  verdict: Verdict | null;
};

/** La pièce est « À sortir » : plus proposée pour créer des tenues. */
export function isLeaving(piece: Piece): boolean {
  return piece.verdict === 'out';
}

function ensureDirectory(): void {
  if (!PIECES_DIRECTORY.exists) {
    PIECES_DIRECTORY.create({ intermediates: true, idempotent: true });
  }
}

function parseCategory(fileName: string): CategoryId | null {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  const separatorIndex = withoutExtension.indexOf(SEPARATOR);

  if (separatorIndex === -1) return null;

  return (withoutExtension.slice(separatorIndex + SEPARATOR.length) as CategoryId) || null;
}

function buildFileName(category: CategoryId | null, extension: string): string {
  const stamp = Date.now();
  return category ? `${stamp}${SEPARATOR}${category}.${extension}` : `${stamp}.${extension}`;
}

/**
 * Construit une pièce. Les échelles sont passées en argument plutôt que relues
 * pour chaque fichier : un seul accès disque suffit à toute la liste.
 */
function toPiece(
  file: File,
  layouts: Record<string, PieceLayout> = listLayouts(),
  verdicts: Record<string, Verdict> = listVerdicts()
): Piece {
  return {
    id: file.name,
    // La date de modification invalide les caches d'image quand un fichier est
    // réécrit sur place (rognage des pièces existantes).
    uri: file.modificationTime ? `${file.uri}?v=${file.modificationTime}` : file.uri,
    category: parseCategory(file.name),
    layout: layouts[file.name] ?? DEFAULT_LAYOUT,
    verdict: verdicts[file.name] ?? null,
  };
}

/** Les pièces, de la plus récente à la plus ancienne (les noms sont horodatés). */
export function listPieces(): Piece[] {
  ensureDirectory();

  const layouts = listLayouts();
  const verdicts = listVerdicts();

  return PIECES_DIRECTORY.list()
    .filter((entry): entry is File => entry instanceof File)
    .map((file) => toPiece(file, layouts, verdicts))
    .sort((a, b) => b.id.localeCompare(a.id));
}

export async function addPiece(
  sourceUri: string,
  category: CategoryId | null = null
): Promise<Piece> {
  ensureDirectory();

  const extension = sourceUri.split('?')[0].split('.').pop() ?? 'jpg';
  const destination = new File(PIECES_DIRECTORY, buildFileName(category, extension));

  const trimmed = await trimTransparentMargins(sourceUri);
  await new File(trimmed ?? sourceUri).copy(destination);

  return toPiece(destination);
}

/**
 * Enregistre une pièce depuis une URL distante (le PNG détouré renvoyé par
 * l'API). Le téléchargement passe par un dossier temporaire unique : les
 * modèles renvoient souvent le même nom de fichier d'une fois sur l'autre.
 */
export async function addPieceFromUrl(
  url: string,
  category: CategoryId | null = null
): Promise<Piece> {
  ensureDirectory();

  const temporary = new Directory(Paths.cache, `cutout-${Date.now()}`);
  temporary.create({ intermediates: true, idempotent: true });

  try {
    const downloaded = await File.downloadFileAsync(url, temporary);
    const extension = downloaded.name.split('?')[0].split('.').pop() ?? 'png';
    const destination = new File(PIECES_DIRECTORY, buildFileName(category, extension));

    const trimmed = await trimTransparentMargins(downloaded.uri);
    await (trimmed ? new File(trimmed) : downloaded).copy(destination);

    return toPiece(destination);
  } finally {
    if (temporary.exists) temporary.delete();
  }
}

/**
 * (Re)classe une pièce existante. La catégorie vivant dans le nom du fichier,
 * reclasser revient à renommer — l'horodatage est conservé pour que la pièce
 * garde sa place dans l'ordre d'ajout.
 */
export function setPieceCategory(id: string, category: CategoryId | null): Piece {
  const file = new File(PIECES_DIRECTORY, id);

  if (!file.exists) {
    throw new Error('Cette pièce est introuvable.');
  }

  const extension = id.split('.').pop() ?? 'jpg';
  const withoutExtension = id.replace(/\.[^.]+$/, '');
  const separatorIndex = withoutExtension.indexOf(SEPARATOR);
  const stamp =
    separatorIndex === -1 ? withoutExtension : withoutExtension.slice(0, separatorIndex);

  const name = category ? `${stamp}${SEPARATOR}${category}.${extension}` : `${stamp}.${extension}`;

  if (name !== id) {
    file.rename(name);

    // L'échelle est indexée par nom de fichier : reclasser renomme, donc il faut
    // déplacer l'entrée, sinon l'ajustement de cadrage serait perdu.
    const layouts = listLayouts();
    if (layouts[id] !== undefined) {
      setPieceLayout(name, layouts[id]);
      forgetPieceLayout(id);
    }

    // Même raison pour les tenues : elles désignent la pièce par son nom de fichier.
    renamePieceInOutfits(id, name);
    moveVerdict(id, name);
  }

  return toPiece(new File(PIECES_DIRECTORY, name));
}

/**
 * Marqueur écrit une fois les pièces existantes rognées. Le numéro change quand
 * le calcul du contour s'améliore (v2 : ombres et pixels parasites ignorés),
 * pour reproposer le rognage aux pièces déjà traitées par l'ancienne version.
 */
const TRIM_DONE_FILE = new File(Paths.document, 'pieces-trimmed-v2');

/** Vrai tant que les pièces d'avant le rognage automatique n'ont pas été traitées. */
export function needsTrimOfExistingPieces(): boolean {
  if (TRIM_DONE_FILE.exists) return false;
  ensureDirectory();
  return PIECES_DIRECTORY.list().some(
    (entry) => entry instanceof File && /\.png$/i.test(entry.name)
  );
}

/**
 * Rogne les marges transparentes des pièces déjà enregistrées, sur place : le
 * nom du fichier (donc l'identifiant et les tenues qui y renvoient) ne change
 * pas.
 *
 * L'échelle réglée sur une pièce rognée est remise à 1 : elle compensait les
 * marges, et appliquée à l'image rognée elle ferait paraître le vêtement trop
 * grand.
 *
 * @returns les identifiants des pièces effectivement rognées.
 */
export async function trimExistingPieces(): Promise<string[]> {
  ensureDirectory();
  const trimmedIds: string[] = [];

  for (const entry of PIECES_DIRECTORY.list()) {
    if (!(entry instanceof File) || !/\.png$/i.test(entry.name)) continue;

    const trimmed = await trimTransparentMargins(entry.uri);
    if (!trimmed) continue;

    const source = new File(trimmed);
    entry.write(await source.bytes());
    source.delete();

    forgetPieceLayout(entry.name);
    trimmedIds.push(entry.name);
  }

  if (!TRIM_DONE_FILE.exists) TRIM_DONE_FILE.create();
  return trimmedIds;
}

export function removePiece(id: string): void {
  const file = new File(PIECES_DIRECTORY, id);
  if (file.exists) {
    file.delete();
  }
  // Sans ça, l'échelle et le verdict survivraient à la photo et seraient
  // réattribués par erreur à une future pièce portant le même nom.
  forgetPieceLayout(id);
  clearVerdict(id);
}

/**
 * La pièce est sortie pour de bon : elle quitte l'app (photo effacée, retirée des
 * tenues), et le compteur des pièces sorties avance. C'est lui qui rapporte des
 * boutons, pour qu'on ne puisse pas en gagner en mettant une pièce « À sortir »
 * puis en la reprenant.
 */
export function removeForGood(id: string): void {
  removePiece(id);
  forgetPiece(id);
  countLeft();
}
