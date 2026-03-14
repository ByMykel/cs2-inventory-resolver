import type {GcItemInput, ItemEntry, ResolvedItemData} from './types.js';
import {getData} from './data-loader.js';

/**
 * Return the wear tier name for a given paint wear float.
 *
 * @param paintWear - A float between 0.0 and 1.0.
 */
function getWearName(paintWear: number): string {
  if (paintWear <= 0.07) return 'Factory New';
  if (paintWear <= 0.15) return 'Minimal Wear';
  if (paintWear <= 0.38) return 'Field-Tested';
  if (paintWear <= 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

/**
 * Check whether a GC item has a specific attribute by def_index.
 */
function hasAttribute(
  item: {attribute?: {def_index: number}[]},
  attrDefIndex: number,
): boolean {
  return (item.attribute || []).some(a => a.def_index === attrDefIndex);
}

/**
 * Build the full decorated name for a skin.
 *
 * The base name from inventory.json already includes `★` for knives/gloves
 * (quality 3). For StatTrak knives the market name is `★ StatTrak™ Karambit | Fade`,
 * so we insert the qualifier after `★ ` rather than before it.
 *
 * - `StatTrak™ ` if attribute 80 exists.
 * - `Souvenir ` if attribute 140 exists.
 * - ` (WearName)` suffix if `paint_wear` is present.
 */
function buildSkinName(name: string, gcItem: GcItemInput): string {
  let qualifier = '';
  if (hasAttribute(gcItem, 80)) qualifier = 'StatTrak™ ';
  else if (hasAttribute(gcItem, 140)) qualifier = 'Souvenir ';

  let decorated: string;
  if (qualifier && gcItem.quality === 3 && name.startsWith('★ ')) {
    // Insert qualifier after the ★ prefix: "★ StatTrak™ Karambit | Fade"
    decorated = `★ ${qualifier}${name.slice(2)}`;
  } else {
    decorated = `${qualifier}${name}`;
  }

  const suffix =
    gcItem.paint_wear != null ? ` (${getWearName(gcItem.paint_wear)})` : '';

  return `${decorated}${suffix}`;
}

/** Build a {@link ResolvedItemData} from a matched inventory entry. */
function makeResult(
  entry: ItemEntry,
  gcItem: GcItemInput,
  entity: ResolvedItemData['entity'],
): ResolvedItemData {
  return {
    name: entity === 'skin' ? buildSkinName(entry.name, gcItem) : entry.name,
    image: entry.image,
    entity,
    rarity: entry.rarity,
    marketable: entry.marketable,
  };
}

/**
 * Resolve a raw GC item into a name, image, and entity.
 *
 * Resolution priority:
 * 1. Skins (by `def_index` + `paint_index`)
 * 2. Music kits (by attribute 166)
 * 3. Highlights / souvenir charms (by attribute 314)
 * 4. Keychains (by attribute 299)
 * 5. Graffiti (by `stickers[0].sticker_id` + attribute 233)
 * 6. Keys (by `def_index`)
 * 7. Crates / cases (by `def_index`)
 * 8. Collectibles (by `def_index`)
 * 9. Agents (by `def_index`)
 * 10. Tools (by `def_index`)
 * 11. Patches (by `stickers[0].sticker_id`)
 * 12. Stickers (by `stickers[0].sticker_id`)
 * 13. Sticker slabs — TODO: add sticker_slabs resolution
 *
 * @param gcItem - The raw GC item to resolve.
 * @returns The resolved item data, or `null` if the item could not be identified.
 *
 * @example
 * ```ts
 * const result = resolveItem({ def_index: 7, paint_index: 282 });
 * // => { name: "AK-47 | Redline", image: "https://...", entity: "skin" }
 * ```
 */
export function resolveItem(gcItem: GcItemInput): ResolvedItemData | null {
  const data = getData();

  const defIdx = String(gcItem.def_index);
  const musicIndex = getAttributeUint32(gcItem, 166);
  const graffitiTint = getAttributeUint32(gcItem, 233);
  const highlightIndex = getAttributeUint32(gcItem, 314);
  const keychainIndex = getAttributeUint32(gcItem, 299);

  // 1. Skins: def_index + paint_index
  if (gcItem.paint_index && gcItem.paint_index > 0) {
    const weapon = data.skins[defIdx];
    if (weapon) {
      const skin = weapon[String(gcItem.paint_index)];
      if (skin) return makeResult(skin, gcItem, 'skin');
    }
  }

  // 2. Music kits: music_index (attribute 166)
  if (musicIndex && musicIndex > 0) {
    const kit = data.music_kits[String(musicIndex)];
    if (kit) return makeResult(kit, gcItem, 'music_kit');
  }

  // 3. Highlights (souvenir charms): highlight_index (attribute 314)
  if (highlightIndex && highlightIndex > 0) {
    const highlight = data.highlights[String(highlightIndex)];
    if (highlight) return makeResult(highlight, gcItem, 'highlight');
  }

  // 4. Keychains (charms): keychain_index (attribute 299)
  if (keychainIndex && keychainIndex > 0) {
    const keychain = data.keychains[String(keychainIndex)];
    if (keychain) return makeResult(keychain, gcItem, 'keychain');
  }

  // 5. Graffiti: stickers[0].sticker_id + graffiti_tint (attribute 233)
  if (graffitiTint !== undefined && gcItem.stickers?.length) {
    const stickerId = gcItem.stickers[0].sticker_id;
    if (stickerId) {
      const tintedKey = `${stickerId}_${graffitiTint}`;
      const tinted = data.graffiti[tintedKey];
      if (tinted) return makeResult(tinted, gcItem, 'graffiti');

      const mono = data.graffiti[String(stickerId)];
      if (mono) return makeResult(mono, gcItem, 'graffiti');
    }
  }

  // 6. Keys
  const key = data.keys[defIdx];
  if (key) return makeResult(key, gcItem, 'key');

  // 7. Crates / cases
  const crate = data.crates[defIdx];
  if (crate) return makeResult(crate, gcItem, 'crate');

  // 8. Collectibles (coins, pins, etc.)
  const collectible = data.collectibles[defIdx];
  if (collectible) return makeResult(collectible, gcItem, 'collectible');

  // 9. Agents (characters)
  const agent = data.agents[defIdx];
  if (agent) return makeResult(agent, gcItem, 'agent');

  // 10. Tools (Name Tag, Storage Unit, etc.)
  const tool = data.tools[defIdx];
  if (tool) return makeResult(tool, gcItem, 'tool');

  // 11. Patches: use stickers[0].sticker_id (checked before stickers)
  if (gcItem.stickers?.length) {
    const stickerId = gcItem.stickers[0].sticker_id;
    if (stickerId) {
      const patch = data.patches[String(stickerId)];
      if (patch) return makeResult(patch, gcItem, 'patch');

      // 12. Stickers
      const sticker = data.stickers[String(stickerId)];
      if (sticker) return makeResult(sticker, gcItem, 'sticker');

      // TODO: add sticker_slabs resolution (separate entity from stickers)
    }
  }

  return null;
}

/**
 * Read a uint32 value from a raw GC item's attribute[] array.
 *
 * Each attribute has a `def_index` identifying which attribute it is, and
 * `value_bytes` containing the raw little-endian bytes.
 *
 * @param item - An object with an optional `attribute` array (typically a {@link GcItemInput}).
 * @param attrDefIndex - The attribute definition index to look up.
 * @returns The decoded uint32 value, or `undefined` if the attribute is missing or too short.
 *
 * @example
 * ```ts
 * const musicIndex = getAttributeUint32(gcItem, 166);
 * if (musicIndex) console.log("Music kit ID:", musicIndex);
 * ```
 */
export function getAttributeUint32(
  item: {attribute?: {def_index: number; value_bytes?: Buffer}[]},
  attrDefIndex: number,
): number | undefined {
  const attrib = (item.attribute || []).find(a => a.def_index === attrDefIndex);
  if (!attrib?.value_bytes || attrib.value_bytes.length < 4) return undefined;
  return attrib.value_bytes.readUInt32LE(0);
}
