export { api, ApiError } from './api';
export {
  listPieces,
  addPiece,
  addPieceFromUrl,
  setPieceCategory,
  removePiece,
} from './pieces';
export type { Piece } from './pieces';
export {
  setPieceScale,
  clampScale,
  MIN_SCALE,
  MAX_SCALE,
  DEFAULT_SCALE,
} from './pieceScales';
export {
  listOutfits,
  addOutfit,
  toggleOutfitFavorite,
  findDuplicate,
  removeOutfit,
  forgetPiece,
  DuplicateOutfitError,
} from './outfits';
export type { Outfit, OutfitDraft } from './outfits';
export { removeBackground, isCutoutConfigured, CutoutError } from './cutout';
