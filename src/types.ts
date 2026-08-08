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
  | 'sticker'
  | 'sticker_slab';

/**
 * Current trade state of a specific item instance, derived from attribute 312
 * (`trade_protected_escrow_date`).
 *
 * - `'tradable'` — no hold; the item can be freely traded and moved to/from storage.
 * - `'market_listed'` — listed on the Steam Community Market and kept in the
 *   inventory until it sells (escrow date is `0`).
 * - `'trade_hold'` — under a trade-protection / escrow hold (escrow date is a
 *   future timestamp).
 *
 * Items that are `'market_listed'` or `'trade_hold'` cannot be moved into or out
 * of a storage unit.
 */
export type TradeStatus = 'tradable' | 'market_listed' | 'trade_hold';

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
  /** Current trade state of this specific item instance. See {@link TradeStatus}. */
  status: TradeStatus;
  /**
   * When a trade hold expires, as an ISO 8601 string, or `null`.
   * Always `null` for `'tradable'` and `'market_listed'` (held until sold).
   */
  trade_hold_expires: string | null;
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
  /**
   * The item quality. Only `3` (★ knife/glove) affects resolution; StatTrak™ and
   * Souvenir are detected from attributes 80 and 140, not from this field.
   */
  quality?: number;
  /** The paint wear float (0.0–1.0). Present only for skins. */
  paint_wear?: number;
  /** Sticker slots array. Also used for graffiti and sticker/patch items via `sticker_id`. */
  stickers?: {sticker_id?: number}[];
  /**
   * Raw attribute array from the GC message.
   *
   * Used to extract `music_index` (def_index 166), `graffiti_tint` (def_index 233),
   * `keychain_index` (def_index 299), `highlight_index` (def_index 314),
   * `sticker_slab_index` (def_index 321), and the
   * `trade_protected_escrow_date` (def_index 312) via {@link getAttributeUint32}.
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
