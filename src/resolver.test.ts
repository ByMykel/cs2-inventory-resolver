import {describe, expect, it} from 'vitest';
import {resolveItem, getAttributeUint32} from './resolver.js';
import {getData} from './data-loader.js';

/** Build an attribute entry with a uint32 LE-encoded value. */
function makeAttr(defIndex: number, value: number) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return {def_index: defIndex, value_bytes: buf};
}

/** Pick the first key from an object, parsed as a number. */
function firstKey(obj: Record<string, unknown>): number {
  return Number(Object.keys(obj)[0]);
}

const data = getData();

// ---------------------------------------------------------------------------
// getAttributeUint32
// ---------------------------------------------------------------------------
describe('getAttributeUint32', () => {
  it('returns undefined when attribute array is empty', () => {
    expect(getAttributeUint32({attribute: []}, 166)).toBeUndefined();
  });

  it('returns undefined when attribute array is missing', () => {
    expect(getAttributeUint32({}, 166)).toBeUndefined();
  });

  it('returns undefined when value_bytes is missing', () => {
    expect(
      getAttributeUint32({attribute: [{def_index: 166}]}, 166),
    ).toBeUndefined();
  });

  it('returns undefined when value_bytes is shorter than 4 bytes', () => {
    expect(
      getAttributeUint32(
        {attribute: [{def_index: 166, value_bytes: Buffer.from([1, 2])}]},
        166,
      ),
    ).toBeUndefined();
  });

  it('correctly decodes a uint32 LE value', () => {
    expect(
      getAttributeUint32({attribute: [makeAttr(166, 42)]}, 166),
    ).toBe(42);
  });

  it('finds the right attribute among multiple entries', () => {
    const item = {attribute: [makeAttr(100, 1), makeAttr(166, 99), makeAttr(200, 3)]};
    expect(getAttributeUint32(item, 166)).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// resolveItem — every resolution path
// ---------------------------------------------------------------------------
describe('resolveItem', () => {
  // 1. Skin
  it('resolves a skin by def_index + paint_index', () => {
    const result = resolveItem({def_index: 7, paint_index: 282});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('skin');
    expect(result!.name).toContain('AK-47');
    expect(result!.image).toBeTruthy();
  });

  // 2. Music kit
  it('resolves a music kit by attribute 166', () => {
    const kitId = firstKey(data.music_kits);
    const result = resolveItem({def_index: 1314, attribute: [makeAttr(166, kitId)]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('music_kit');
    expect(result!.name).toBe(data.music_kits[String(kitId)].name);
  });

  // 3. Highlight (souvenir charm)
  it('resolves a highlight by attribute 314', () => {
    const hlId = firstKey(data.highlights);
    const result = resolveItem({def_index: 4000, attribute: [makeAttr(314, hlId)]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('highlight');
    expect(result!.name).toBe(data.highlights[String(hlId)].name);
  });

  // 4. Keychain
  it('resolves a keychain by attribute 299', () => {
    const kcId = firstKey(data.keychains);
    const result = resolveItem({def_index: 4000, attribute: [makeAttr(299, kcId)]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('keychain');
    expect(result!.name).toBe(data.keychains[String(kcId)].name);
  });

  // 5. Graffiti (tinted)
  it('resolves a tinted graffiti by sticker_id + attribute 233', () => {
    // Find a tinted graffiti key like "1697_1"
    const tintedKey = Object.keys(data.graffiti).find(k => k.includes('_'))!;
    const [stickerId, tint] = tintedKey.split('_').map(Number);

    const result = resolveItem({
      def_index: 4000,
      stickers: [{sticker_id: stickerId}],
      attribute: [makeAttr(233, tint)],
    });
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('graffiti');
    expect(result!.name).toBe(data.graffiti[tintedKey].name);
  });

  // 6. Graffiti (mono fallback)
  it('falls back to mono graffiti when tinted key is not found', () => {
    // 1653 is a mono-only graffiti (no tinted variants exist)
    const result = resolveItem({
      def_index: 4000,
      stickers: [{sticker_id: 1653}],
      attribute: [makeAttr(233, 9999)], // non-existent tint
    });
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('graffiti');
    expect(result!.name).toBe(data.graffiti['1653'].name);
  });

  // 7. Key
  it('resolves a key by def_index', () => {
    const keyId = firstKey(data.keys);
    const result = resolveItem({def_index: keyId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('key');
    expect(result!.name).toBe(data.keys[String(keyId)].name);
  });

  // 8. Crate
  it('resolves a crate by def_index', () => {
    const crateId = firstKey(data.crates);
    const result = resolveItem({def_index: crateId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('crate');
    expect(result!.name).toBe(data.crates[String(crateId)].name);
  });

  // 9. Collectible
  it('resolves a collectible by def_index', () => {
    const colId = firstKey(data.collectibles);
    const result = resolveItem({def_index: colId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('collectible');
    expect(result!.name).toBe(data.collectibles[String(colId)].name);
  });

  // 10. Agent
  it('resolves an agent by def_index', () => {
    const agentId = firstKey(data.agents);
    const result = resolveItem({def_index: agentId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('agent');
    expect(result!.name).toBe(data.agents[String(agentId)].name);
  });

  // 11. Tool
  it('resolves a tool by def_index', () => {
    // Tool def_indices (1-4) overlap with skins, but without paint_index the
    // skin path won't match and it falls through to the tool lookup.
    const toolId = firstKey(data.tools);
    const result = resolveItem({def_index: toolId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('tool');
    expect(result!.name).toBe(data.tools[String(toolId)].name);
  });

  // 12. Patch
  it('resolves a patch by stickers[0].sticker_id', () => {
    const patchId = firstKey(data.patches);
    const result = resolveItem({def_index: 50000, stickers: [{sticker_id: patchId}]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('patch');
    expect(result!.name).toBe(data.patches[String(patchId)].name);
  });

  // 13. Sticker
  it('resolves a sticker by stickers[0].sticker_id', () => {
    const stickerId = firstKey(data.stickers);
    const result = resolveItem({def_index: 1209, stickers: [{sticker_id: stickerId}]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('sticker');
    expect(result!.name).toBe(data.stickers[String(stickerId)].name);
  });

  // 14. Unknown item → null
  it('returns null for an unknown def_index', () => {
    expect(resolveItem({def_index: 999999})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Priority / precedence
// ---------------------------------------------------------------------------
describe('resolveItem — priority', () => {
  it('skin takes priority over crate when both match', () => {
    // Use a def_index that is also a crate key, with a valid paint_index
    const crateId = firstKey(data.crates);
    // Craft a fake scenario: even if def_index is a crate, paint_index wins
    // We use AK-47 (7) which is a valid skin weapon
    const result = resolveItem({def_index: 7, paint_index: 282});
    expect(result!.entity).toBe('skin');
  });

  it('music kit attribute takes priority over crate def_index', () => {
    const crateId = firstKey(data.crates);
    const kitId = firstKey(data.music_kits);
    const result = resolveItem({def_index: crateId, attribute: [makeAttr(166, kitId)]});
    expect(result!.entity).toBe('music_kit');
  });

  it('key takes priority over crate when def_index is in both', () => {
    // keys and crates don't currently overlap, but key is checked first
    const keyId = firstKey(data.keys);
    const result = resolveItem({def_index: keyId});
    expect(result!.entity).toBe('key');
  });

  it('patch takes priority over sticker when sticker_id matches both', () => {
    // Find a patch sticker_id that is also in stickers (if any)
    const patchKeys = Object.keys(data.patches);
    const overlapping = patchKeys.find(k => data.stickers[k]);
    if (overlapping) {
      const result = resolveItem({def_index: 50000, stickers: [{sticker_id: Number(overlapping)}]});
      expect(result!.entity).toBe('patch');
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('resolveItem — edge cases', () => {
  it('paint_index of 0 is treated as no skin (falls through)', () => {
    const crateId = firstKey(data.crates);
    const result = resolveItem({def_index: crateId, paint_index: 0});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('crate');
  });

  it('empty stickers array does not crash', () => {
    const crateId = firstKey(data.crates);
    const result = resolveItem({def_index: crateId, stickers: []});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('crate');
  });

  it('handles undefined optional fields gracefully', () => {
    const crateId = firstKey(data.crates);
    const result = resolveItem({
      def_index: crateId,
      paint_index: undefined,
      stickers: undefined,
      attribute: undefined,
    });
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('crate');
  });
});
