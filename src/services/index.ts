export { api, ApiError } from './api';
export {
  listPieces,
  addPiece,
  addPieceFromUrl,
  setPieceCategory,
  removePiece,
} from './pieces';
export type { Piece } from './pieces';
export { removeBackground, isCutoutConfigured, CutoutError } from './cutout';
