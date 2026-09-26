export { api, ApiError } from './api';
export {
  listPieces,
  addPiece,
  addPieceFromUrl,
  setPieceCategory,
  removePiece,
  needsTrimOfExistingPieces,
  trimExistingPieces,
} from './pieces';
export type { Piece } from './pieces';
export {
  setPieceLayout,
  clampLayout,
  MIN_SCALE,
  MAX_SCALE,
  DEFAULT_LAYOUT,
} from './pieceLayouts';
export type { PieceLayout } from './pieceLayouts';
export {
  listOutfits,
  addOutfit,
  updateOutfitPieces,
  toggleOutfitFavorite,
  setOutfitSlotLayout,
  clearOutfitLayouts,
  resetOutfitScalesFor,
  findDuplicate,
  removeOutfit,
  forgetPiece,
  DuplicateOutfitError,
} from './outfits';
export type { Outfit, OutfitDraft } from './outfits';
export { removeBackground, isCutoutConfigured, CutoutError } from './cutout';
