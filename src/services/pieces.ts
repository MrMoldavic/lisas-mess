import { Directory, File, Paths } from 'expo-file-system';

import type { CategoryId } from '@/types';

import {
  DEFAULT_SCALE,
  forgetPieceScale,
  listScales,
  setPieceScale,
} from './pieceScales';

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
  /** Facteur d'affichage, 1 si la pièce n'a jamais été ajustée. */
  scale: number;
};

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
function toPiece(file: File, scales: Record<string, number> = listScales()): Piece {
  return {
    id: file.name,
    uri: file.uri,
    category: parseCategory(file.name),
    scale: scales[file.name] ?? DEFAULT_SCALE,
  };
}

/** Les pièces, de la plus récente à la plus ancienne (les noms sont horodatés). */
export function listPieces(): Piece[] {
  ensureDirectory();

  const scales = listScales();

  return PIECES_DIRECTORY.list()
    .filter((entry): entry is File => entry instanceof File)
    .map((file) => toPiece(file, scales))
    .sort((a, b) => b.id.localeCompare(a.id));
}

export async function addPiece(
  sourceUri: string,
  category: CategoryId | null = null
): Promise<Piece> {
  ensureDirectory();

  const extension = sourceUri.split('?')[0].split('.').pop() ?? 'jpg';
  const destination = new File(PIECES_DIRECTORY, buildFileName(category, extension));

  await new File(sourceUri).copy(destination);

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

    await downloaded.copy(destination);

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
    const scales = listScales();
    if (scales[id] !== undefined) {
      setPieceScale(name, scales[id]);
      forgetPieceScale(id);
    }
  }

  return toPiece(new File(PIECES_DIRECTORY, name));
}

export function removePiece(id: string): void {
  const file = new File(PIECES_DIRECTORY, id);
  if (file.exists) {
    file.delete();
  }
  // Sans ça, l'échelle survivrait à la photo et serait réattribuée par erreur
  // à une future pièce portant le même nom.
  forgetPieceScale(id);
}
