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

  it('returns 0 for a zero-filled 4-byte buffer', () => {
    const buf = Buffer.alloc(4, 0);
    expect(
      getAttributeUint32({attribute: [{def_index: 166, value_bytes: buf}]}, 166),
    ).toBe(0);
  });

  it('reads only the first 4 bytes from a longer buffer', () => {
    const buf = Buffer.alloc(8);
    buf.writeUInt32LE(123, 0);
    buf.writeUInt32LE(999, 4);
    expect(
      getAttributeUint32({attribute: [{def_index: 166, value_bytes: buf}]}, 166),
    ).toBe(123);
  });
});

// ---------------------------------------------------------------------------
// resolveItem — every resolution path
// ---------------------------------------------------------------------------
describe('resolveItem', () => {
  // 1. Skin — name is decorated
  it('resolves a skin with decorated name', () => {
    const result = resolveItem({def_index: 7, paint_index: 282, paint_wear: 0.30});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('skin');
    expect(result!.name).toContain('AK-47');
    expect(result!.name).toContain('(Field-Tested)');
    expect(result!.image).toBeTruthy();
    expect(result!.rarity).toBeDefined();
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 1b. Skin — StatTrak
  it('resolves a StatTrak skin with prefix in name', () => {
    const result = resolveItem({
      def_index: 7,
      paint_index: 282,
      paint_wear: 0.30,
      attribute: [makeAttr(80, 1)],
    });
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/^StatTrak™ .+ \(Field-Tested\)$/);
  });

  // 1c. Skin — Souvenir
  it('resolves a Souvenir skin with prefix in name', () => {
    const result = resolveItem({
      def_index: 7,
      paint_index: 282,
      paint_wear: 0.30,
      attribute: [makeAttr(140, 1)],
    });
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/^Souvenir .+ \(Field-Tested\)$/);
  });

  // 1d. Skin — ★ knife (★ comes from inventory data)
  it('resolves a knife with ★ already in name from data', () => {
    const knifeDef = Object.keys(data.skins).find(d => Number(d) >= 500);
    if (knifeDef) {
      const paintId = firstKey(data.skins[knifeDef]);
      const result = resolveItem({
        def_index: Number(knifeDef),
        paint_index: paintId,
        quality: 3,
        paint_wear: 0.01,
      });
      expect(result).not.toBeNull();
      expect(result!.name).toMatch(/^★ .+ \(Factory New\)$/);
    }
  });

  // 1e. Skin — ★ StatTrak knife
  it('resolves a StatTrak knife as ★ StatTrak™ ...', () => {
    const knifeDef = Object.keys(data.skins).find(d => Number(d) >= 500);
    if (knifeDef) {
      const paintId = firstKey(data.skins[knifeDef]);
      const result = resolveItem({
        def_index: Number(knifeDef),
        paint_index: paintId,
        quality: 3,
        paint_wear: 0.01,
        attribute: [makeAttr(80, 1)],
      });
      expect(result).not.toBeNull();
      expect(result!.name).toMatch(/^★ StatTrak™ .+ \(Factory New\)$/);
    }
  });

  // 2. Music kit
  it('resolves a music kit by attribute 166', () => {
    const kitId = firstKey(data.music_kits);
    const result = resolveItem({def_index: 1314, attribute: [makeAttr(166, kitId)]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('music_kit');
    expect(result!.name).toBe(data.music_kits[String(kitId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 3. Highlight (souvenir charm)
  it('resolves a highlight by attribute 314', () => {
    const hlId = firstKey(data.highlights);
    const result = resolveItem({def_index: 4000, attribute: [makeAttr(314, hlId)]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('highlight');
    expect(result!.name).toBe(data.highlights[String(hlId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 4. Keychain
  it('resolves a keychain by attribute 299', () => {
    const kcId = firstKey(data.keychains);
    const result = resolveItem({def_index: 4000, attribute: [makeAttr(299, kcId)]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('keychain');
    expect(result!.name).toBe(data.keychains[String(kcId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 5. Graffiti (tinted)
  it('resolves a tinted graffiti by sticker_id + attribute 233', () => {
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
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 6. Graffiti (mono fallback)
  it('falls back to mono graffiti when tinted key is not found', () => {
    const result = resolveItem({
      def_index: 4000,
      stickers: [{sticker_id: 1653}],
      attribute: [makeAttr(233, 9999)],
    });
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('graffiti');
    expect(result!.name).toBe(data.graffiti['1653'].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 7. Key
  it('resolves a key by def_index', () => {
    const keyId = firstKey(data.keys);
    const result = resolveItem({def_index: keyId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('key');
    expect(result!.name).toBe(data.keys[String(keyId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 8. Crate
  it('resolves a crate by def_index', () => {
    const crateId = firstKey(data.crates);
    const result = resolveItem({def_index: crateId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('crate');
    expect(result!.name).toBe(data.crates[String(crateId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 9. Collectible
  it('resolves a collectible by def_index', () => {
    const colId = firstKey(data.collectibles);
    const result = resolveItem({def_index: colId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('collectible');
    expect(result!.name).toBe(data.collectibles[String(colId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 10. Agent
  it('resolves an agent by def_index', () => {
    const agentId = firstKey(data.agents);
    const result = resolveItem({def_index: agentId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('agent');
    expect(result!.name).toBe(data.agents[String(agentId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 11. Tool
  it('resolves a tool by def_index', () => {
    const toolId = firstKey(data.tools);
    const result = resolveItem({def_index: toolId});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('tool');
    expect(result!.name).toBe(data.tools[String(toolId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 12. Patch
  it('resolves a patch by stickers[0].sticker_id', () => {
    const patchId = firstKey(data.patches);
    const result = resolveItem({def_index: 50000, stickers: [{sticker_id: patchId}]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('patch');
    expect(result!.name).toBe(data.patches[String(patchId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 13. Sticker
  it('resolves a sticker by stickers[0].sticker_id', () => {
    const stickerId = firstKey(data.stickers);
    const result = resolveItem({def_index: 1209, stickers: [{sticker_id: stickerId}]});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('sticker');
    expect(result!.name).toBe(data.stickers[String(stickerId)].name);
    expect(typeof result!.marketable).toBe('boolean');
  });

  // 14. Non-skin name is unchanged
  it('non-skin entities return name unchanged', () => {
    const crateId = firstKey(data.crates);
    const result = resolveItem({def_index: crateId});
    expect(result).not.toBeNull();
    expect(result!.name).toBe(data.crates[String(crateId)].name);
  });

  // 15. Unknown item → null
  it('returns null for an unknown def_index', () => {
    expect(resolveItem({def_index: 999999})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Priority / precedence
// ---------------------------------------------------------------------------
describe('resolveItem — priority', () => {
  it('skin takes priority over crate when both match', () => {
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
    const keyId = firstKey(data.keys);
    const result = resolveItem({def_index: keyId});
    expect(result!.entity).toBe('key');
  });

  it('patch takes priority over sticker when sticker_id matches both', () => {
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

// ---------------------------------------------------------------------------
// Wear-name boundaries via resolveItem (AK-47 Redline, def 7 paint 282)
// ---------------------------------------------------------------------------
describe('resolveItem — wear-name boundaries', () => {
  const skin = {def_index: 7, paint_index: 282};

  it('Factory New at boundary (0.07)', () => {
    const result = resolveItem({...skin, paint_wear: 0.07});
    expect(result!.name).toContain('(Factory New)');
  });

  it('Minimal Wear just above Factory New boundary (0.071)', () => {
    const result = resolveItem({...skin, paint_wear: 0.071});
    expect(result!.name).toContain('(Minimal Wear)');
  });

  it('Minimal Wear at boundary (0.15)', () => {
    const result = resolveItem({...skin, paint_wear: 0.15});
    expect(result!.name).toContain('(Minimal Wear)');
  });

  it('Field-Tested just above Minimal Wear boundary (0.151)', () => {
    const result = resolveItem({...skin, paint_wear: 0.151});
    expect(result!.name).toContain('(Field-Tested)');
  });

  it('Field-Tested at boundary (0.38)', () => {
    const result = resolveItem({...skin, paint_wear: 0.38});
    expect(result!.name).toContain('(Field-Tested)');
  });

  it('Well-Worn just above Field-Tested boundary (0.381)', () => {
    const result = resolveItem({...skin, paint_wear: 0.381});
    expect(result!.name).toContain('(Well-Worn)');
  });

  it('Well-Worn at boundary (0.45)', () => {
    const result = resolveItem({...skin, paint_wear: 0.45});
    expect(result!.name).toContain('(Well-Worn)');
  });

  it('Battle-Scarred just above Well-Worn boundary (0.451)', () => {
    const result = resolveItem({...skin, paint_wear: 0.451});
    expect(result!.name).toContain('(Battle-Scarred)');
  });

  it('Battle-Scarred at 1.0', () => {
    const result = resolveItem({...skin, paint_wear: 1.0});
    expect(result!.name).toContain('(Battle-Scarred)');
  });

  it('Factory New at 0.0', () => {
    const result = resolveItem({...skin, paint_wear: 0.0});
    expect(result!.name).toContain('(Factory New)');
  });
});

// ---------------------------------------------------------------------------
// Numeric edge cases
// ---------------------------------------------------------------------------
describe('resolveItem — numeric edge cases', () => {
  it('NaN paint_wear still resolves as a skin', () => {
    const result = resolveItem({def_index: 7, paint_index: 282, paint_wear: NaN});
    expect(result).not.toBeNull();
    expect(result!.entity).toBe('skin');
    // NaN fails all <= checks, so falls through to Battle-Scarred
    expect(result!.name).toContain('(Battle-Scarred)');
  });

  it('Infinity paint_wear resolves as Battle-Scarred', () => {
    const result = resolveItem({def_index: 7, paint_index: 282, paint_wear: Infinity});
    expect(result).not.toBeNull();
    expect(result!.name).toContain('(Battle-Scarred)');
  });

  it('negative paint_wear resolves as Factory New', () => {
    const result = resolveItem({def_index: 7, paint_index: 282, paint_wear: -1});
    expect(result).not.toBeNull();
    expect(result!.name).toContain('(Factory New)');
  });

  it('fractional def_index is coerced to string for lookup', () => {
    // 7.5 becomes "7.5" which won't match any key → null
    const result = resolveItem({def_index: 7.5});
    expect(result).toBeNull();
  });

  it('negative def_index returns null', () => {
    const result = resolveItem({def_index: -1});
    expect(result).toBeNull();
  });
});
