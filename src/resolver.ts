import type {GcItemInput, ResolvedItemData} from './types.js';
import {getData} from './data-loader.js';

/**
 * Resolve a raw GC item into a name, image, and category.
 *
 * Resolution priority:
 * 1. Skins (by `def_index` + `paint_index`)
 * 2. Music kits (by attribute 166)
 * 3. Highlights / souvenir charms (by attribute 314)
 * 4. Keychains (by attribute 299)
 * 5. Graffiti (by `stickers[0].sticker_id` + attribute 233)
 * 6. Crates / cases / keys (by `def_index`)
 * 7. Collectibles (by `def_index`)
 * 8. Stickers / patches (by `stickers[0].sticker_id`)
 *
 * @param gcItem - The raw GC item to resolve.
 * @returns The resolved item data, or `null` if the item could not be identified.
 *
 * @example
 * ```ts
 * const result = resolveItem({ def_index: 7, paint_index: 282 });
 * // => { name: "AK-47 | Redline", image: "https://...", category: "skin" }
 * ```
 */
export function resolveItem(gcItem: GcItemInput): ResolvedItemData | null {
  const data = getData();
  if (!data) return null;

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
      if (skin) return {name: skin.name, image: skin.image, category: 'skin'};
    }
  }

  // 2. Music kits: music_index (attribute 166)
  if (musicIndex && musicIndex > 0) {
    const kit = data.music_kits[String(musicIndex)];
    if (kit) return {name: kit.name, image: kit.image, category: 'music_kit'};
  }

  // 3. Highlights (souvenir charms): highlight_index (attribute 314)
  if (highlightIndex && highlightIndex > 0) {
    const highlight = data.highlights[String(highlightIndex)];
    if (highlight) return {name: highlight.name, image: highlight.image, category: 'highlight'};
  }

  // 4. Keychains (charms): keychain_index (attribute 299)
  if (keychainIndex && keychainIndex > 0) {
    const keychain = data.keychains[String(keychainIndex)];
    if (keychain) return {name: keychain.name, image: keychain.image, category: 'keychain'};
  }

  // 5. Graffiti: stickers[0].sticker_id + graffiti_tint (attribute 233)
  if (graffitiTint !== undefined && gcItem.stickers?.length) {
    const stickerId = gcItem.stickers[0].sticker_id;
    if (stickerId) {
      const tintedKey = `${stickerId}_${graffitiTint}`;
      const tinted = data.graffiti[tintedKey];
      if (tinted) return {name: tinted.name, image: tinted.image, category: 'graffiti'};

      const mono = data.graffiti[String(stickerId)];
      if (mono) return {name: mono.name, image: mono.image, category: 'graffiti'};
    }
  }

  // 6. Crates / cases / keys
  const crate = data.crates[defIdx];
  if (crate) return {name: crate.name, image: crate.image, category: 'crate'};

  // 7. Collectibles (coins, pins, etc.)
  const collectible = data.collectibles[defIdx];
  if (collectible) return {name: collectible.name, image: collectible.image, category: 'collectible'};

  // 8. Stickers/patches as items: use stickers[0].sticker_id
  if (gcItem.stickers?.length) {
    const stickerId = gcItem.stickers[0].sticker_id;
    if (stickerId) {
      const sticker = data.stickers[String(stickerId)];
      if (sticker) return {name: sticker.name, image: sticker.image, category: 'sticker'};
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
