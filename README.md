# cs2-inventory-resolver

Resolve raw CS2 Game Coordinator (GC) items into human-readable names, images, and categories.

## Installation

```bash
npm install cs2-inventory-resolver
```

## Usage

### `resolveItem(gcItem)`

Takes a raw GC item and returns its name, image URL, entity type, rarity, and marketability.

For skins, the `name` is fully decorated with the appropriate prefix and wear:

- `StatTrak™` prefix (detected via attribute 80)
- `Souvenir` prefix (detected via attribute 140)
- `★` for knives/gloves (already included in the base name)
- Wear suffix based on `paint_wear` (e.g. `Factory New`, `Field-Tested`)

```ts
import { resolveItem } from 'cs2-inventory-resolver';

// Regular skin
resolveItem({ def_index: 7, paint_index: 282, paint_wear: 0.30 });
// => { name: "AK-47 | Redline (Field-Tested)", image: "https://...", entity: "skin", rarity: { id: "rarity_mythical_weapon", name: "Restricted", color: "#8847ff" }, marketable: true }

// StatTrak skin
resolveItem({ def_index: 7, paint_index: 282, paint_wear: 0.30, attribute: [{ def_index: 80, value_bytes: ... }] });
// => { name: "StatTrak™ AK-47 | Redline (Field-Tested)", ... }

// StatTrak knife (quality 3 = ★ already in name)
resolveItem({ def_index: 507, paint_index: 38, quality: 3, paint_wear: 0.01, attribute: [{ def_index: 80, value_bytes: ... }] });
// => { name: "★ StatTrak™ Karambit | Fade (Factory New)", ... }

// Non-skin item
resolveItem({ def_index: 1505 });
// => { name: "CS:GO Case Key", image: "https://...", entity: "key", rarity: null, marketable: true }
```

Returns `null` if the item could not be identified.

#### Input (`GcItemInput`)

| Field | Type | Description |
|-------|------|-------------|
| `def_index` | `number` | Item definition index (required) |
| `paint_index` | `number?` | Paint/skin index |
| `quality` | `number?` | Item quality (`3` = ★ knife/glove) |
| `paint_wear` | `number?` | Wear float (`0.0`–`1.0`) |
| `stickers` | `{sticker_id?: number}[]?` | Sticker slots |
| `attribute` | `{def_index: number; value_bytes?: Buffer}[]?` | Raw attribute array |

#### Output (`ResolvedItemData`)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Decorated item name |
| `image` | `string` | Image URL |
| `entity` | `ItemEntity` | Item type (`skin`, `crate`, `key`, `collectible`, etc.) |
| `rarity` | `{id, name, color} \| null` | Rarity info or `null` |
| `marketable` | `boolean` | Whether the item is marketable on Steam |

### `getAttributeUint32(item, attrDefIndex)`

Reads a uint32 value from a GC item's raw `attribute[]` array.

```ts
import { getAttributeUint32 } from 'cs2-inventory-resolver';

const musicIndex = getAttributeUint32(gcItem, 166);
if (musicIndex) {
  console.log('Music kit ID:', musicIndex);
}
```
