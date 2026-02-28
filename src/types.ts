/** Possible CS2 item entity types returned by {@link resolveItem}. */
export type ItemEntity =
  | 'skin'
  | 'music_kit'
  | 'highlight'
  | 'keychain'
  | 'graffiti'
  | 'crate'
  | 'key'
  | 'collectible'
  | 'agent'
  | 'tool'
  | 'patch'
  | 'sticker';

/** The resolved information for a CS2 inventory item. */
export interface ResolvedItemData {
  /** The human-readable item name (e.g. `"AK-47 | Redline"`). */
  name: string;
  /** URL to the item's image. */
  image: string;
  /** The resolved item entity type. */
  entity: ItemEntity;
  /** The item's rarity, or `null` if the item has no rarity. */
  rarity: {id: string; name: string; color: string} | null;
  /** Whether the item is marketable on the Steam Community Market. */
  marketable: boolean;
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
  /** The item quality (3 = ★ knife/glove, 9 = StatTrak, 12 = Souvenir). */
  quality?: number;
  /** The paint wear float (0.0–1.0). Present only for skins. */
  paint_wear?: number;
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
  rarity: {id: string; name: string; color: string} | null;
  marketable: boolean;
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
  agents: Record<string, ItemEntry>;
  patches: Record<string, ItemEntry>;
  keys: Record<string, ItemEntry>;
  sticker_slabs: Record<string, ItemEntry>;
  tools: Record<string, ItemEntry>;
}
