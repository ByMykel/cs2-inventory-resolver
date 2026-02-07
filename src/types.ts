/** Possible CS2 item categories returned by {@link resolveItem}. */
export type ItemCategory =
  | 'skin'
  | 'music_kit'
  | 'highlight'
  | 'keychain'
  | 'graffiti'
  | 'crate'
  | 'collectible'
  | 'sticker';

/** The resolved information for a CS2 inventory item. */
export interface ResolvedItemData {
  /** The human-readable item name (e.g. `"AK-47 | Redline"`). */
  name: string;
  /** URL to the item's image. */
  image: string;
  /** The resolved item category. */
  category: ItemCategory;
}

/**
 * Raw GC (Game Coordinator) item input accepted by {@link resolveItem}.
 *
 * This mirrors the relevant fields from the CS2 GC protobuf `CSOEconItem` message.
 */
export interface GcItemInput {
  /** The item definition index from the GC protobuf message. */
  def_index: number;
  /** The paint/skin index. Non-zero for weapon skins. */
  paint_index?: number;
  /** Sticker slots array. Also used for graffiti and sticker/patch items via `sticker_id`. */
  stickers?: {sticker_id?: number}[];
  /**
   * Raw attribute array from the GC message.
   *
   * Used to extract `music_index` (def_index 166), `graffiti_tint` (def_index 233),
   * `keychain_index` (def_index 299), and `highlight_index` (def_index 314) via {@link getAttributeUint32}.
   */
  attribute?: {def_index: number; value_bytes?: Buffer}[];
}

/** A single entry in the inventory lookup tables. */
export interface ItemEntry {
  name: string;
  image: string;
}

/** The full shape of inventory.json from the API. */
export interface InventoryData {
  skins: Record<string, Record<string, ItemEntry>>;
  crates: Record<string, ItemEntry>;
  collectibles: Record<string, ItemEntry>;
  stickers: Record<string, ItemEntry>;
  graffiti: Record<string, ItemEntry>;
  music_kits: Record<string, ItemEntry>;
  keychains: Record<string, ItemEntry>;
  highlights: Record<string, ItemEntry>;
}
